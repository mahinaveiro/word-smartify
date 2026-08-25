'use client'

import { useRef, useState } from 'react'
import { Check, ImagePlus, MessageSquare, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, Label } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_CATEGORY_LABELS,
  type FeedbackCategory,
} from '@/types/feedback'

const MAX_MESSAGE_LENGTH = 4000
const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

type FeedbackResponse = { error?: string; emailSent?: boolean }

function formatFileSize(size: number) {
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function FeedbackView() {
  const { toast } = useToast()
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [category, setCategory] = useState<FeedbackCategory>('suggestion')
  const [message, setMessage] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [emailSent, setEmailSent] = useState<boolean | null>(null)

  function clearPhoto() {
    setPhoto(null)
    setPhotoError(null)
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  function onPhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextPhoto = event.target.files?.[0] ?? null
    if (!nextPhoto) return

    if (!ACCEPTED_PHOTO_TYPES.includes(nextPhoto.type as (typeof ACCEPTED_PHOTO_TYPES)[number])) {
      setPhoto(null)
      setPhotoError('Attach a JPG, PNG, or WebP image.')
      event.target.value = ''
      return
    }
    if (nextPhoto.size > MAX_PHOTO_BYTES) {
      setPhoto(null)
      setPhotoError('That photo is too large. Please choose an image smaller than 5 MB.')
      event.target.value = ''
      return
    }

    setPhoto(nextPhoto)
    setPhotoError(null)
    setError(null)
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedMessage = message.trim()
    if (!trimmedMessage) {
      setError('Tell us a little more before sending.')
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
        <CardContent className="flex flex-col items-center px-5 py-10 text-center sm:px-8">
          <span className="grid size-12 place-items-center rounded-full border-2 border-foreground bg-mint text-mint-foreground shadow-brutal-sm">
            <Check className="size-6" aria-hidden />
          </span>
          <h2 className="mt-4 font-heading text-xl font-bold">Thanks for the feedback</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
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
            className="mt-6"
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

  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-md border-2 border-foreground bg-mint text-mint-foreground">
            <MessageSquare className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-heading text-lg font-bold">Help & feedback</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tell us what would make studying with Word Smartify better.
            </p>
          </div>
        </div>

        <form className="mt-6 space-y-5" onSubmit={onSubmit}>
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
              rows={6}
              maxLength={MAX_MESSAGE_LENGTH}
              aria-invalid={Boolean(error)}
              className="w-full resize-y rounded-md border-2 border-foreground bg-card px-3.5 py-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus-visible:shadow-brutal-sm focus-visible:ring-0 aria-[invalid=true]:border-destructive"
            />
            <p className="mt-1.5 text-right text-xs text-muted-foreground">{message.length}/{MAX_MESSAGE_LENGTH}</p>
          </Field>

          <fieldset>
            <legend className="mb-1.5 block font-heading text-sm font-semibold">Feedback type</legend>
            <div className="grid grid-cols-2 gap-2">
              {FEEDBACK_CATEGORIES.map((value) => {
                const selected = category === value
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setCategory(value)}
                    className={cn(
                      'min-h-11 rounded-md border-2 px-3 py-2 text-left text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
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
            <Label htmlFor="feedback-photo">Attach a photo <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <div className="flex flex-wrap items-center gap-2">
              <label
                htmlFor="feedback-photo"
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border-2 border-foreground bg-card px-3 py-2 text-sm font-semibold transition-colors hover:bg-muted focus-within:shadow-brutal-sm"
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
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-foreground/20 bg-muted px-2.5 py-2 text-xs text-muted-foreground">
                  <span className="max-w-[12rem] truncate">{photo.name}</span>
                  <span className="shrink-0">{formatFileSize(photo.size)}</span>
                  <button
                    type="button"
                    aria-label="Remove attached photo"
                    onClick={clearPhoto}
                    className="ml-0.5 rounded p-0.5 text-foreground transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </span>
              ) : null}
            </div>
            <p className={cn('mt-1.5 text-xs text-muted-foreground', photoError && 'font-medium text-destructive')}>
              {photoError || 'JPG, PNG, or WebP · up to 5 MB · sent with the feedback email and not stored.'}
            </p>
          </div>

          <div className="flex justify-end border-t-2 border-foreground/10 pt-4">
            <Button type="submit" loading={submitting} disabled={!message.trim() || Boolean(photoError)}>
              <Send className="size-4" aria-hidden />
              Send feedback
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
