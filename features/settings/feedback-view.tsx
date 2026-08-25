'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, ImagePlus, LoaderCircle, MessageSquare, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, Label } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_PAGE_OPTIONS,
  feedbackPageLabel,
  type FeedbackCategory,
  type FeedbackPageKey,
} from '@/types/feedback'

const MAX_MESSAGE_LENGTH = 4000
const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

type FeedbackResponse = { error?: string; emailSent?: boolean }
type PhotoStatus = 'idle' | 'preparing' | 'ready'

function formatFileSize(size: number) {
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function FeedbackPageSelect({
  value,
  onChange,
}: {
  value: FeedbackPageKey[]
  onChange: (value: FeedbackPageKey[]) => void
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedLabel = value.length === 0
    ? 'Select page(s)'
    : value.length === 1
      ? feedbackPageLabel(value[0])
      : `${value.length} pages selected`

  useEffect(() => {
    if (!open) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'relative flex h-10 w-full items-center justify-between rounded-md border-2 border-foreground bg-card px-3 pr-10 text-left text-sm font-medium text-foreground transition-colors',
          'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        <span className={cn('truncate', value.length === 0 && 'text-muted-foreground')}>{selectedLabel}</span>
        <ChevronDown className={cn('pointer-events-none absolute right-3 size-4 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open ? (
        <div role="listbox" aria-label="Pages" aria-multiselectable="true" className="absolute inset-x-0 top-full z-50 mt-1 h-52 overflow-y-auto overscroll-contain rounded-md border-2 border-foreground bg-card p-1 shadow-brutal-sm">
          {FEEDBACK_PAGE_OPTIONS.map((option) => {
            const selected = value.includes(option.value)
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(selected ? value.filter((item) => item !== option.value) : [...value, option.value])
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  selected && 'bg-mint/45 font-semibold',
                )}
              >
                <span className="truncate">{option.label}</span>
                {selected ? <Check className="size-4 shrink-0" aria-hidden /> : null}
              </button>
            )
          })}
          <button
            type="button"
            className="mt-1 w-full rounded border-t border-foreground/10 px-2.5 py-2 text-left text-xs font-semibold text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setOpen(false)}
          >
            Done
          </button>
        </div>
      ) : null}
    </div>
  )
}

export function FeedbackView() {
  const { toast } = useToast()
  const photoInputRef = useRef<HTMLInputElement>(null)
  const photoSelectionRef = useRef(0)
  const [category, setCategory] = useState<FeedbackCategory>('suggestion')
  const [message, setMessage] = useState('')
  const [selectedPages, setSelectedPages] = useState<FeedbackPageKey[]>([])
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoStatus, setPhotoStatus] = useState<PhotoStatus>('idle')
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [emailSent, setEmailSent] = useState<boolean | null>(null)

  function clearPhoto() {
    photoSelectionRef.current += 1
    setPhoto(null)
    setPhotoStatus('idle')
    setPhotoError(null)
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  function onPhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextPhoto = event.target.files?.[0] ?? null
    if (!nextPhoto) return

    if (!ACCEPTED_PHOTO_TYPES.includes(nextPhoto.type as (typeof ACCEPTED_PHOTO_TYPES)[number])) {
      setPhoto(null)
      setPhotoStatus('idle')
      setPhotoError('Attach a JPG, PNG, or WebP image.')
      event.target.value = ''
      return
    }
    if (nextPhoto.size > MAX_PHOTO_BYTES) {
      setPhoto(null)
      setPhotoStatus('idle')
      setPhotoError('That photo is too large. Please choose an image smaller than 5 MB.')
      event.target.value = ''
      return
    }

    const selectionId = photoSelectionRef.current + 1
    photoSelectionRef.current = selectionId
    setPhoto(nextPhoto)
    setPhotoStatus('preparing')
    setPhotoError(null)
    setError(null)

    window.setTimeout(() => {
      void nextPhoto.arrayBuffer()
        .then(() => {
          if (photoSelectionRef.current === selectionId) setPhotoStatus('ready')
        })
        .catch(() => {
          if (photoSelectionRef.current !== selectionId) return
          setPhoto(null)
          setPhotoStatus('idle')
          setPhotoError('That photo could not be prepared. Please choose it again.')
          if (photoInputRef.current) photoInputRef.current.value = ''
        })
    }, 180)
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedMessage = message.trim()
    if (!trimmedMessage) {
      setError('Tell us a little more before sending.')
      return
    }
    if (photoStatus === 'preparing') {
      setError('Wait for the photo to finish preparing.')
      return
    }
    if (photoError) return

    setSubmitting(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('category', category)
      formData.append('message', trimmedMessage)
      formData.append('pagePath', window.location.pathname)
      formData.append('pagePaths', JSON.stringify(selectedPages))
      if (photo) formData.append('photo', photo, photo.name)

      const response = await fetch('/api/feedback', {
        method: 'POST',
        body: formData,
      })
      const payload = (await response.json().catch(() => null)) as FeedbackResponse | null
      if (!response.ok) throw new Error(payload?.error || 'Your feedback could not be sent.')

      setSubmitted(true)
      setEmailSent(payload?.emailSent === true)
      setMessage('')
      setSelectedPages([])
      clearPhoto()
      toast({ title: 'Feedback sent', description: 'Thanks for helping improve Word Smartify.', tone: 'success' })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Your feedback could not be sent.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center px-4 py-8 text-center sm:px-8">
          <span className="grid size-12 place-items-center rounded-full border-2 border-foreground bg-mint text-mint-foreground shadow-brutal-sm">
            <Check className="size-6" aria-hidden />
          </span>
          <h2 className="mt-3 font-heading text-xl font-bold">Thanks for the feedback</h2>
          <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
            Your message has been saved and will be reviewed.
          </p>
          {emailSent === false ? (
            <p className="mt-2 max-w-md text-xs font-medium text-muted-foreground">
              Your message is safe in our records. The notification email is temporarily unavailable.
            </p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-5"
            onClick={() => {
              setSubmitted(false)
              setEmailSent(null)
            }}
          >
            Send more feedback
          </Button>
        </CardContent>
      </Card>
    )
  }

  const photoIsReady = photoStatus === 'ready'
  const sendDisabled = submitting || !message.trim() || Boolean(photoError) || photoStatus === 'preparing'

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-md border-2 border-foreground bg-mint text-mint-foreground">
            <MessageSquare className="size-4.5" aria-hidden />
          </span>
          <h2 className="pt-1 font-heading text-lg font-bold">Help & feedback</h2>
        </div>

        <form className="mt-4 space-y-4" onSubmit={onSubmit}>
          <Field label="What would you like to share?" htmlFor="feedback-message" error={error ?? undefined}>
            <textarea
              id="feedback-message"
              name="feedback-message"
              value={message}
              onChange={(event) => {
                setMessage(event.target.value.slice(0, MAX_MESSAGE_LENGTH))
                if (error) setError(null)
              }}
              placeholder="Share an idea, tell us about a problem, or ask a question…"
              rows={4}
              maxLength={MAX_MESSAGE_LENGTH}
              aria-invalid={Boolean(error)}
              className="w-full resize-y rounded-md border-2 border-foreground bg-card px-3 py-2.5 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus-visible:shadow-brutal-sm focus-visible:ring-0 aria-[invalid=true]:border-destructive"
            />
            <p className="mt-1 text-right text-[0.7rem] text-muted-foreground">{message.length}/{MAX_MESSAGE_LENGTH}</p>
          </Field>

          <fieldset>
            <legend className="mb-1 block font-heading text-sm font-semibold">Feedback type</legend>
            <div className="grid grid-cols-2 gap-1.5">
              {FEEDBACK_CATEGORIES.map((value) => {
                const selected = category === value
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setCategory(value)}
                    className={cn(
                      'min-h-10 rounded-md border-2 px-2.5 py-1.5 text-left text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                      selected
                        ? 'border-foreground bg-mint text-mint-foreground shadow-brutal-sm'
                        : 'border-foreground/70 bg-card hover:bg-muted',
                    )}
                  >
                    {FEEDBACK_CATEGORY_LABELS[value]}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <div>
            <Label htmlFor="feedback-page-select">Where did you notice it? <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <FeedbackPageSelect value={selectedPages} onChange={setSelectedPages} />
          </div>

          <div>
            <Label htmlFor="feedback-photo">Attach a photo <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <label
                htmlFor="feedback-photo"
                className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-md border-2 border-foreground bg-card px-2.5 py-1.5 text-sm font-semibold transition-colors hover:bg-muted focus-within:shadow-brutal-sm"
              >
                <ImagePlus className="size-4" aria-hidden />
                {photo ? 'Change photo' : 'Choose photo'}
                <input
                  ref={photoInputRef}
                  id="feedback-photo"
                  name="photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={onPhotoChange}
                  className="sr-only"
                />
              </label>
              {photo ? (
                <div className={cn(
                  'relative inline-flex min-h-10 max-w-full items-center gap-1.5 rounded-md border-2 border-foreground px-2.5 py-1.5 pr-14 text-xs transition-colors',
                  photoIsReady ? 'bg-card' : 'bg-muted/80',
                )}>
                  <ImagePlus className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="max-w-[9rem] truncate">{photo.name}</span>
                  <span className="shrink-0 text-muted-foreground">{formatFileSize(photo.size)}</span>
                  <span
                    className="absolute right-1 top-1 grid size-5 place-items-center rounded-full border border-foreground/20 bg-card"
                    aria-label={photoIsReady ? 'Photo ready to attach' : 'Preparing photo'}
                  >
                    {photoIsReady ? <Check className="size-3.5 text-mint-foreground" aria-hidden /> : <LoaderCircle className="size-3.5 animate-spin text-muted-foreground" aria-hidden />}
                  </span>
                  <button
                    type="button"
                    aria-label="Remove attached photo"
                    onClick={clearPhoto}
                    className="absolute right-7 top-1 rounded p-0.5 text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                </div>
              ) : null}
            </div>
            {photoError ? <p className="mt-1 text-xs font-medium text-destructive">{photoError}</p> : null}
          </div>

          <div className="flex justify-end pt-0.5">
            <Button type="submit" size="sm" loading={submitting} disabled={sendDisabled}>
              <Send className="size-4" aria-hidden />
              Send feedback
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
