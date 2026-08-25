'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ImagePlus, Loader2, Minus, Plus } from 'lucide-react'
import { Avatar } from '@/features/shared/avatar'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { useActions } from '@/hooks/use-actions'
import { createClient } from '@/lib/supabase/client'
import { DISPLAY_NAME_MAX, validateDisplayName } from '@/lib/profile'
import type { Profile } from '@/types/database'

const MAX_INPUT_BYTES = 10 * 1024 * 1024
const MAX_OUTPUT_BYTES = 1024 * 1024
const CROP_OUTPUT_SIZE = 640
const CROP_MIN_SCALE = 1
const CROP_MAX_SCALE = 3

type CropSource = {
  file: File
  url: string
}

type CropOffset = {
  x: number
  y: number
  scale: number
}

export function DisplayNameField({
  value,
  onChange,
  disabled = false,
  id = 'display-name',
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  id?: string
}) {
  const error = value.length > 0 ? validateDisplayName(value) : 'Display name is required.'
  return (
    <Field label="Display name" htmlFor={id} error={error ?? undefined}>
      <Input
        id={id}
        value={value}
        maxLength={DISPLAY_NAME_MAX}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        disabled={disabled}
        placeholder="Your name"
      />
    </Field>
  )
}

export function AvatarUpload({
  userId,
  name,
  avatarId,
  avatarUrl,
  disabled = false,
  onUpdated,
}: {
  userId: string
  name: string
  avatarId: string
  avatarUrl: string
  disabled?: boolean
  onUpdated: (profile: Profile) => Promise<unknown> | unknown
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cropFrameRef = useRef<HTMLDivElement>(null)
  const sourceImageRef = useRef<HTMLImageElement>(null)
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null)
  const [source, setSource] = useState<CropSource | null>(null)
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null)
  const [crop, setCrop] = useState<CropOffset>({ x: 0, y: 0, scale: 1 })
  const [cropOpen, setCropOpen] = useState(false)
  const [frameWidth, setFrameWidth] = useState(320)
  const [uploading, setUploading] = useState(false)
  const { updateProfile, revalidateUser } = useActions()
  const { toast } = useToast()
  const supabase = createClient()

  const revokeSource = useCallback((current: CropSource | null) => {
    if (current) URL.revokeObjectURL(current.url)
  }, [])

  const closeCropper = useCallback((force = false) => {
    if (uploading && !force) return
    setCropOpen(false)
    setSource((current) => {
      revokeSource(current)
      return null
    })
    setImageSize(null)
    setCrop({ x: 0, y: 0, scale: 1 })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [revokeSource, uploading])

  useEffect(() => {
    return () => revokeSource(source)
  }, [revokeSource, source])

  useEffect(() => {
    if (!cropOpen || !cropFrameRef.current) return
    const frame = cropFrameRef.current
    const updateFrameWidth = () => setFrameWidth(frame.clientWidth || 320)
    updateFrameWidth()
    const observer = new ResizeObserver(updateFrameWidth)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [cropOpen])

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast({ title: 'Unsupported image type', description: 'Choose a JPG, PNG, or WebP image.', tone: 'error' })
      event.target.value = ''
      return
    }
    if (file.size > MAX_INPUT_BYTES) {
      toast({ title: 'Image is too large', description: 'Choose an image smaller than 10 MB.', tone: 'error' })
      event.target.value = ''
      return
    }
    const nextSource = { file, url: URL.createObjectURL(file) }
    setSource((current) => {
      revokeSource(current)
      return nextSource
    })
    setImageSize(null)
    setCrop({ x: 0, y: 0, scale: 1 })
    setCropOpen(true)
  }

  function handleImageLoad() {
    const image = sourceImageRef.current
    if (!image) return
    setImageSize({ width: image.naturalWidth, height: image.naturalHeight })
  }

  function clampOffset(x: number, y: number, scale: number) {
    const frame = frameWidth
    if (!imageSize) return { x, y }
    const fit = Math.max(frame / imageSize.width, frame / imageSize.height)
    const displayedWidth = imageSize.width * fit * scale
    const displayedHeight = imageSize.height * fit * scale
    const maxX = Math.max(0, (displayedWidth - frame) / 2)
    const maxY = Math.max(0, (displayedHeight - frame) / 2)
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    }
  }

  function setZoom(nextScale: number) {
    const scale = Math.min(CROP_MAX_SCALE, Math.max(CROP_MIN_SCALE, nextScale))
    const offset = clampOffset(crop.x, crop.y, scale)
    setCrop({ scale, ...offset })
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!imageSize || uploading) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: crop.x,
      originY: crop.y,
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const offset = clampOffset(drag.originX + event.clientX - drag.startX, drag.originY + event.clientY - drag.startY, crop.scale)
    setCrop((current) => ({ ...current, ...offset }))
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null
  }

  async function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
    return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
  }

  async function createCroppedBlob(): Promise<Blob> {
    const image = sourceImageRef.current
    const frame = frameWidth
    if (!image || !imageSize || !source) throw new Error('The selected image is not ready yet.')

    const fit = Math.max(frame / imageSize.width, frame / imageSize.height)
    const scaledImageWidth = imageSize.width * fit * crop.scale
    const scaledImageHeight = imageSize.height * fit * crop.scale
    const imageLeft = (frame - scaledImageWidth) / 2 + crop.x
    const imageTop = (frame - scaledImageHeight) / 2 + crop.y
    const sourceSize = frame / (fit * crop.scale)
    const sourceX = Math.min(Math.max(0, -imageLeft / (fit * crop.scale)), Math.max(0, imageSize.width - sourceSize))
    const sourceY = Math.min(Math.max(0, -imageTop / (fit * crop.scale)), Math.max(0, imageSize.height - sourceSize))
    const boundedSourceSize = Math.min(sourceSize, imageSize.width - sourceX, imageSize.height - sourceY)

    const canvas = document.createElement('canvas')
    canvas.width = CROP_OUTPUT_SIZE
    canvas.height = CROP_OUTPUT_SIZE
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Your browser could not prepare the image.')
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(image, sourceX, sourceY, boundedSourceSize, boundedSourceSize, 0, 0, CROP_OUTPUT_SIZE, CROP_OUTPUT_SIZE)

    for (const quality of [0.84, 0.76, 0.68, 0.6]) {
      const blob = await canvasBlob(canvas, 'image/webp', quality)
      if (blob && blob.size <= MAX_OUTPUT_BYTES) return blob
    }
    for (const quality of [0.82, 0.72, 0.62]) {
      const blob = await canvasBlob(canvas, 'image/jpeg', quality)
      if (blob && blob.size <= MAX_OUTPUT_BYTES) return blob
    }
    throw new Error('This image could not be compressed enough. Please choose a simpler image.')
  }

  function managedAvatarPath(url: string) {
    const marker = '/storage/v1/object/public/avatars/'
    const markerIndex = url.indexOf(marker)
    if (markerIndex === -1) return null
    const path = decodeURIComponent(url.slice(markerIndex + marker.length).split('?')[0])
    return path.startsWith(`${userId}/`) ? path : null
  }

  async function uploadCrop() {
    if (!source || uploading) return
    setUploading(true)
    try {
      const blob = await createCroppedBlob()
      const extension = blob.type === 'image/webp' ? 'webp' : 'jpg'
      const objectPath = `${userId}/${crypto.randomUUID()}.${extension}`
      const uploadResult = await supabase.storage.from('avatars').upload(objectPath, blob, {
        cacheControl: '31536000',
        contentType: blob.type,
        upsert: false,
      })
      if (uploadResult.error) throw new Error(uploadResult.error.message)

      const { data } = supabase.storage.from('avatars').getPublicUrl(objectPath)
      let updated: Profile
      try {
        updated = await updateProfile({ avatar_url: data.publicUrl })
      } catch (error) {
        await supabase.storage.from('avatars').remove([objectPath])
        throw error
      }

      await onUpdated(updated)
      await revalidateUser()
      const previousPath = managedAvatarPath(avatarUrl)
      if (previousPath && previousPath !== objectPath) {
        await supabase.storage.from('avatars').remove([previousPath])
      }
      toast({ title: 'Profile picture updated', description: 'Your cropped photo is now active.', tone: 'success' })
      closeCropper(true)
    } catch (error) {
      toast({
        title: 'Could not update profile picture',
        description: error instanceof Error ? error.message : 'Try again with another image.',
        tone: 'error',
      })
    } finally {
      setUploading(false)
    }
  }

  const fit = imageSize ? Math.max(frameWidth / imageSize.width, frameWidth / imageSize.height) : 1
  const renderedWidth = imageSize ? imageSize.width * fit * crop.scale : 0
  const renderedHeight = imageSize ? imageSize.height * fit * crop.scale : 0

  return (
    <>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={name || 'Word Smartify'} avatarId={avatarId} avatarUrl={avatarUrl || null} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="font-heading text-sm font-semibold">Profile picture</p>
          <p className="mt-1 text-xs text-muted-foreground">Upload a photo, crop it, and we’ll compress it before saving.</p>
          <input
            ref={fileInputRef}
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFile}
            disabled={disabled || uploading}
          />
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => fileInputRef.current?.click()} disabled={disabled || uploading}>
            <ImagePlus className="size-4" aria-hidden />
            Change photo
          </Button>
        </div>
      </div>

      <Modal
        open={cropOpen}
        onClose={closeCropper}
        title="Crop your profile picture"
        description="Drag the photo inside the circle and adjust the zoom."
        className="max-w-md"
        footer={
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => closeCropper()} disabled={uploading}>
              Cancel
            </Button>
            <Button type="button" variant="accent" size="sm" onClick={uploadCrop} disabled={!imageSize || uploading} loading={uploading}>
              {uploading ? 'Saving photo' : 'Use photo'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div
            ref={cropFrameRef}
            className="relative mx-auto aspect-square w-full max-w-[320px] touch-none select-none overflow-hidden rounded-full border-2 border-foreground bg-foreground/10 shadow-brutal-sm"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            role="application"
            aria-label="Profile picture crop area"
          >
            {source ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={sourceImageRef}
                src={source.url}
                alt=""
                onLoad={handleImageLoad}
                draggable={false}
                className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
                style={{
                  width: renderedWidth || 'auto',
                  height: renderedHeight || 'auto',
                  transform: `translate(calc(-50% + ${crop.x}px), calc(-50% + ${crop.y}px))`,
                }}
              />
            ) : null}
            <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-inset ring-card/80" aria-hidden />
            {!imageSize ? (
              <span className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">Preparing photo…</span>
            ) : null}
          </div>

          <div className="flex items-center justify-center gap-3" aria-label="Zoom controls">
            <Button type="button" variant="outline" size="sm" onClick={() => setZoom(crop.scale - 0.1)} disabled={uploading || crop.scale <= CROP_MIN_SCALE} aria-label="Zoom out">
              <Minus className="size-4" aria-hidden />
            </Button>
            <span className="min-w-16 text-center text-xs font-semibold text-muted-foreground">{Math.round(crop.scale * 100)}%</span>
            <Button type="button" variant="outline" size="sm" onClick={() => setZoom(crop.scale + 0.1)} disabled={uploading || crop.scale >= CROP_MAX_SCALE} aria-label="Zoom in">
              <Plus className="size-4" aria-hidden />
            </Button>
          </div>

          {uploading ? (
            <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Compressing and saving your photo…
            </p>
          ) : null}
        </div>
      </Modal>
    </>
  )
}

export function profileSaveDisabled(name: string, saving: boolean): boolean {
  return saving || validateDisplayName(name) != null
}
