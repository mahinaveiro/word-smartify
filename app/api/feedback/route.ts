import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { feedbackCategoryLabel, isFeedbackCategory, type FeedbackCategory } from '@/types/feedback'

const MAX_MESSAGE_LENGTH = 4000
const MAX_PAGE_PATH_LENGTH = 160
const MAX_SUBMISSIONS_PER_HOUR = 3

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

function getReporterName(user: { email?: string; user_metadata?: unknown }, displayName: unknown) {
  if (typeof displayName === 'string' && displayName.trim()) return displayName.trim().slice(0, 120)

  const metadata = user.user_metadata as Record<string, unknown> | undefined
  const metadataName = [metadata?.full_name, metadata?.name].find(
    (value): value is string => typeof value === 'string' && value.trim().length > 0,
  )
  if (metadataName) return metadataName.trim().slice(0, 120)

  return user.email?.split('@')[0]?.trim().slice(0, 120) || 'Unknown student'
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    return NextResponse.json({ error: 'You must be signed in to send feedback.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid feedback request.' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid feedback request.' }, { status: 400 })
  }

  const payload = body as Record<string, unknown>
  const category = payload.category
  const message = normalizeText(payload.message, MAX_MESSAGE_LENGTH)
  const pagePath = normalizeText(payload.pagePath, MAX_PAGE_PATH_LENGTH)

  if (!isFeedbackCategory(category)) {
    return NextResponse.json({ error: 'Choose a feedback type.' }, { status: 400 })
  }
  if (!message) {
    return NextResponse.json({ error: 'Tell us a little more before sending.' }, { status: 400 })
  }
  if (pagePath && !pagePath.startsWith('/')) {
    return NextResponse.json({ error: 'The feedback page reference is invalid.' }, { status: 400 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (profileError) {
    console.warn('Feedback profile lookup failed; using auth fallback', profileError)
  }

  const reporterEmail = authData.user.email || 'Email unavailable'
  const reporterName = getReporterName(authData.user, profile?.display_name)
  const admin = createAdminClient()
  const rateLimitSince = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count, error: rateLimitError } = await admin
    .from('feedback_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', authData.user.id)
    .gte('created_at', rateLimitSince)

  if (rateLimitError) {
    console.error('Feedback rate-limit lookup failed', rateLimitError)
    return NextResponse.json({ error: 'Feedback is temporarily unavailable. Please try again.' }, { status: 500 })
  }
  if ((count ?? 0) >= MAX_SUBMISSIONS_PER_HOUR) {
    return NextResponse.json({ error: 'You have sent several messages recently. Please try again later.' }, { status: 429 })
  }

  const { data: feedback, error: feedbackError } = await admin
    .from('feedback_submissions')
    .insert({
      user_id: authData.user.id,
      user_email: reporterEmail,
      display_name: reporterName,
      category,
      message,
      page_path: pagePath,
    })
    .select('id')
    .single()

  if (feedbackError || !feedback) {
    console.error('Feedback insert failed', feedbackError)
    return NextResponse.json({ error: 'Your feedback could not be saved. Please try again.' }, { status: 500 })
  }

  const apiKey = process.env.RESEND_API_KEY
  const recipient = process.env.FEEDBACK_TO_EMAIL || process.env.QUESTION_REPORTS_TO_EMAIL
  const sender = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
  let emailSent = false

  if (apiKey && recipient) {
    const resend = new Resend(apiKey)
    const { error: emailError } = await resend.emails.send({
      from: sender,
      to: recipient,
      subject: `Word Smartify feedback · ${feedbackCategoryLabel(category as FeedbackCategory)}`,
      html: `
        <h2>Word Smartify feedback</h2>
        <p><strong>Type:</strong> ${escapeHtml(feedbackCategoryLabel(category as FeedbackCategory))}</p>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(message).replaceAll('\n', '<br />')}</p>
        <hr />
        <h3>Reporter</h3>
        <p><strong>Name:</strong> ${escapeHtml(reporterName)}</p>
        <p><strong>Email:</strong> ${escapeHtml(reporterEmail)}</p>
        <p><strong>UID:</strong> ${escapeHtml(authData.user.id)}</p>
        ${pagePath ? `<p><strong>Page:</strong> ${escapeHtml(pagePath)}</p>` : ''}
        <p><strong>Feedback ID:</strong> ${escapeHtml(feedback.id)}</p>
      `,
    })

    if (emailError) {
      const emailErrorMessage = emailError.message?.slice(0, 1000) || 'The owner email could not be sent.'
      console.error('Feedback email failed', emailError)
      await admin
        .from('feedback_submissions')
        .update({ email_error: emailErrorMessage })
        .eq('id', feedback.id)
    } else {
      emailSent = true
      const { error: emailStatusError } = await admin
        .from('feedback_submissions')
        .update({ email_sent: true, email_sent_at: new Date().toISOString() })
        .eq('id', feedback.id)
      if (emailStatusError) console.error('Feedback email status update failed', emailStatusError)
    }
  } else {
    console.warn('Feedback email is not configured; submission remains stored in Supabase.', {
      hasApiKey: Boolean(apiKey),
      hasRecipient: Boolean(recipient),
    })
  }

  return NextResponse.json({ ok: true, emailSent })
}
