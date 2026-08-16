import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import {
  isQuestionReportCategory,
  isQuestionReportMode,
} from '@/types/question-reports'

const QUESTION_ID_PATTERN = /^[0-9a-f-]{36}$/i

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, maxLength) : null
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    return NextResponse.json({ error: 'You must be signed in to report a question.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid report request.' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid report request.' }, { status: 400 })
  }

  const payload = body as Record<string, unknown>
  const questionId = normalizeText(payload.questionId, 80)
  const category = payload.category
  const mode = payload.mode
  const note = normalizeText(payload.note, 1000)

  if (!questionId || !QUESTION_ID_PATTERN.test(questionId)) {
    return NextResponse.json({ error: 'This question could not be identified.' }, { status: 400 })
  }
  if (!isQuestionReportCategory(category)) {
    return NextResponse.json({ error: 'Choose a report reason.' }, { status: 400 })
  }
  if (!isQuestionReportMode(mode)) {
    return NextResponse.json({ error: 'This quiz mode is not supported.' }, { status: 400 })
  }

  const { data: question, error: questionError } = await supabase
    .from('quiz_questions')
    .select('id, word_id, question, question_type, options, correct_answer')
    .eq('id', questionId)
    .maybeSingle()

  if (questionError) {
    console.error('Question report lookup failed', questionError)
    return NextResponse.json({ error: 'We could not load this question.' }, { status: 500 })
  }
  if (!question) {
    return NextResponse.json({ error: 'This question is no longer available.' }, { status: 404 })
  }

  const { error: reportError } = await supabase
    .from('question_reports')
    .insert({
      user_id: authData.user.id,
      question_id: question.id,
      word_id: question.word_id,
      category,
      note,
      mode,
      question_text: question.question,
      question_type: question.question_type,
      options: question.options,
      correct_answer: question.correct_answer,
    })

  if (reportError) {
    console.error('Question report insert failed', reportError)
    return NextResponse.json({ error: 'Your report could not be saved. Please try again.' }, { status: 500 })
  }

  const apiKey = process.env.RESEND_API_KEY
  const recipient = process.env.QUESTION_REPORTS_TO_EMAIL
  const sender = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
  let emailSent = false

  if (apiKey && recipient) {
    const resend = new Resend(apiKey)
    const noteHtml = note ? `<p><strong>Student note:</strong> ${escapeHtml(note)}</p>` : '<p><strong>Student note:</strong> None provided.</p>'
    const optionsHtml = Array.isArray(question.options)
      ? `<p><strong>Options:</strong> ${question.options.map((option) => escapeHtml(String(option))).join(' · ')}</p>`
      : ''
    const { error: emailError } = await resend.emails.send({
      from: sender,
      to: recipient,
      subject: `Word Smartify question report · ${category.replace('_', ' ')}`,
      html: `
        <h2>Question report</h2>
        <p><strong>Reason:</strong> ${escapeHtml(category.replace('_', ' '))}</p>
        <p><strong>Mode:</strong> ${escapeHtml(mode)}</p>
        <p><strong>Question ID:</strong> ${escapeHtml(question.id)}</p>
        <p><strong>Question:</strong> ${escapeHtml(question.question)}</p>
        <p><strong>Type:</strong> ${escapeHtml(question.question_type)}</p>
        ${optionsHtml}
        <p><strong>Stored answer:</strong> ${escapeHtml(question.correct_answer)}</p>
        ${noteHtml}
      `,
    })

    if (emailError) {
      console.error('Question report email failed', emailError)
    } else {
      emailSent = true
    }
  } else {
    console.warn('Question report email is not configured; report remains stored in Supabase.', {
      hasApiKey: Boolean(apiKey),
      hasRecipient: Boolean(recipient),
    })
  }

  return NextResponse.json({ ok: true, emailSent })
}
