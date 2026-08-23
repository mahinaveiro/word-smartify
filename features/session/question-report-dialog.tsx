'use client'

import { Flag, Send } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import {
  QUESTION_REPORT_CATEGORIES,
  QUESTION_REPORT_CATEGORY_LABELS,
  type QuestionReportCategory,
  type QuestionReportMode,
} from '@/types/question-reports'
import type { QuizQuestion } from '@/types/database'
import { trackProductEvent } from '@/lib/product-analytics'

const QUICK_REPORT_CATEGORIES = QUESTION_REPORT_CATEGORIES.filter(
  (value): value is Exclude<QuestionReportCategory, 'other'> => value !== 'other',
)

export function QuestionReportDialog({
  question,
  mode,
}: {
  question: QuizQuestion
  mode: QuestionReportMode
}) {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<QuestionReportCategory>('broken_question')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const noteInputRef = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()

  async function submitReport() {
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/question-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: question.id,
          category,
          note,
          mode,
        }),
      })
      const payload = (await response.json().catch(() => null)) as { error?: string } | null

      if (!response.ok) {
        throw new Error(payload?.error || 'Your report could not be submitted.')
      }

      setOpen(false)
      trackProductEvent('question_report_submitted', { category, mode })
      toast({
        title: 'Report received',
        description: 'Thanks. We will review this question.',
        tone: 'success',
      })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Your report could not be submitted.')
    } finally {
      setSubmitting(false)
    }
  }

  function openReportDialog() {
    setCategory('broken_question')
    setNote('')
    setError(null)
    setOpen(true)
  }

  function chooseOther() {
    setCategory('other')
    requestAnimationFrame(() => noteInputRef.current?.focus())
  }

  return (
    <>
      <IconButton
        label="Report this question"
        variant="ghost"
        size="sm"
        aria-haspopup="dialog"
        onClick={openReportDialog}
      >
        <Flag aria-hidden />
      </IconButton>

      <Modal
        open={open}
        onClose={() => {
          if (!submitting) setOpen(false)
        }}
        title="Report question"
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
        footer={
          <>
            <Button type="button" variant="ghost" size="sm" disabled={submitting} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" loading={submitting} onClick={submitReport}>
              <Send aria-hidden />
              Submit
            </Button>
          </>
        }
      >
        <fieldset disabled={submitting}>
          <legend className="sr-only">Reason for reporting</legend>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Reason for reporting">
            {QUICK_REPORT_CATEGORIES.map((value) => (
              <label
                key={value}
                className={`flex min-h-11 cursor-pointer items-center justify-center rounded-md border-2 px-2.5 py-2 text-center text-sm font-semibold leading-tight transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${
                  category === value ? 'border-foreground bg-muted' : 'border-foreground/20 bg-card hover:border-foreground/60'
                }`}
              >
                <input
                  type="radio"
                  name={`question-report-${question.id}`}
                  value={value}
                  checked={category === value}
                  onChange={() => setCategory(value)}
                  className="sr-only"
                />
                {QUESTION_REPORT_CATEGORY_LABELS[value]}
              </label>
            ))}
          </div>

          <button
            type="button"
            className={`mt-3 text-sm font-semibold underline decoration-foreground/40 underline-offset-4 transition-colors hover:decoration-foreground ${
              category === 'other' ? 'text-foreground' : 'text-muted-foreground'
            }`}
            aria-pressed={category === 'other'}
            onClick={chooseOther}
          >
            Other
          </button>

          <label htmlFor={`question-report-note-${question.id}`} className="mt-4 block text-sm font-semibold">
            Details <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <textarea
            ref={noteInputRef}
            id={`question-report-note-${question.id}`}
            value={note}
            onChange={(event) => setNote(event.target.value.slice(0, 1000))}
            placeholder="Add details (optional)"
            rows={3}
            className="mt-2 w-full resize-none rounded-md border-2 border-foreground bg-card px-3 py-2.5 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <p className="mt-1 text-right text-xs text-muted-foreground">{note.length}/1000</p>
          {error ? <p className="mt-3 text-sm font-semibold text-coral-foreground" role="alert">{error}</p> : null}
        </fieldset>
      </Modal>
    </>
  )
}
