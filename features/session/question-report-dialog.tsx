'use client'

import { Flag, Send } from 'lucide-react'
import { useState } from 'react'
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

export function QuestionReportDialog({
  question,
  mode,
}: {
  question: QuizQuestion
  mode: QuestionReportMode
}) {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<QuestionReportCategory>('faulty_question')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

  return (
    <>
      <IconButton
        label="Report this question"
        variant="ghost"
        size="sm"
        aria-haspopup="dialog"
        onClick={() => {
          setCategory('faulty_question')
          setNote('')
          setError(null)
          setOpen(true)
        }}
      >
        <Flag aria-hidden />
      </IconButton>

      <Modal
        open={open}
        onClose={() => {
          if (!submitting) setOpen(false)
        }}
        title="Report question"
        description="Tell us what went wrong so we can fix it."
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
          <div className="grid gap-2">
            {QUESTION_REPORT_CATEGORIES.map((value) => (
              <label
                key={value}
                className={`flex cursor-pointer items-center gap-3 rounded-md border-2 px-3 py-3 text-sm font-semibold transition-colors ${
                  category === value ? 'border-foreground bg-muted' : 'border-foreground/20 bg-card hover:border-foreground/60'
                }`}
              >
                <input
                  type="radio"
                  name={`question-report-${question.id}`}
                  value={value}
                  checked={category === value}
                  onChange={() => setCategory(value)}
                  className="size-4 accent-foreground"
                />
                {QUESTION_REPORT_CATEGORY_LABELS[value]}
              </label>
            ))}
          </div>

          <label htmlFor={`question-report-note-${question.id}`} className="mt-4 block text-sm font-semibold">
            Add a note <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <textarea
            id={`question-report-note-${question.id}`}
            value={note}
            onChange={(event) => setNote(event.target.value.slice(0, 1000))}
            placeholder="What did you notice?"
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
