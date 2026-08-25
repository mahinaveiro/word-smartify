import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  FEEDBACK_PAGE_OPTIONS,
  feedbackCategoryLabel,
  feedbackPageLabel,
  isFeedbackCategory,
  isFeedbackPageKey,
  type FeedbackCategory,
} from '@/types/feedback'

export const runtime = 'nodejs'

const MAX_MESSAGE_LENGTH = 4000
const MAX_PAGE_PATH_LENGTH = 160
const MAX_SUBMISSIONS_PER_HOUR = 3
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024
const MAX_REQUEST_BYTES = MAX_ATTACHMENT_BYTES + 512 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

type FeedbackAttachment = {
  filename: string
  contentType: 'image/jpeg' | 'image/png' | 'image/webp'
  size: number
  buffer: Buffer
}

type ParsedInput = {
  category: unknown
  message: unknown
  pagePath: unknown
  pagePaths: unknown
  attachment: FeedbackAttachment | null
}

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

function normalizePagePaths(value: unknown) {
  let rawValue: unknown = value
  if (typeof value === 'string') {
    try {
      rawValue = JSON.parse(value)
    } catch {
      rawValue = []
    }
  }

  const values = Array.isArray(rawValue) ? rawValue : []
  return Array.from(new Set(values.filter(isFeedbackPageKey))).slice(0, FEEDBACK_PAGE_OPTIONS.length)
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

function hasImageSignature(buffer: Buffer, contentType: string) {
  if (contentType === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  }
  if (contentType === 'image/png') {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  }
  if (contentType === 'image/webp') {
    return buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP'
  }
  return false
}

function safeAttachmentFilename(originalName: string, contentType: string) {
  const baseName = originalName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
  return `${baseName || 'feedback-photo'}.${IMAGE_EXTENSIONS[contentType]}`
}

async function parseInput(request: Request): Promise<ParsedInput | { error: string }> {
  const contentLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return { error: 'That photo is too large. Please attach an image smaller than 5 MB.' }
  }

  const contentType = request.headers.get('content-type')?.toLowerCase() || ''
  if (!contentType.includes('multipart/form-data')) {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return { error: 'Invalid feedback request.' }
    }

    if (!body || typeof body !== 'object') return { error: 'Invalid feedback request.' }
    const payload = body as Record<string, unknown>
    return {
      category: payload.category,
      message: payload.message,
      pagePath: payload.pagePath,
      pagePaths: payload.pagePaths,
      attachment: null,
    }
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return { error: 'The feedback form could not be read. Please try again.' }
  }

  const photoEntry = formData.get('photo')
  if (photoEntry !== null && typeof File !== 'undefined' && photoEntry instanceof File && photoEntry.size > 0) {
    if (!ALLOWED_IMAGE_TYPES.has(photoEntry.type)) {
      return { error: 'Attach a JPG, PNG, or WebP image.' }
    }
    if (photoEntry.size > MAX_ATTACHMENT_BYTES) {
      return { error: 'That photo is too large. Please attach an image smaller than 5 MB.' }
    }

    const buffer = Buffer.from(await photoEntry.arrayBuffer())
    if (!hasImageSignature(buffer, photoEntry.type)) {
      return { error: 'That file does not look like a valid image.' }
    }

    return {
      category: formData.get('category'),
      message: formData.get('message'),
      pagePath: formData.get('pagePath'),
      pagePaths: formData.get('pagePaths'),
      attachment: {
        filename: safeAttachmentFilename(photoEntry.name, photoEntry.type),
        contentType: photoEntry.type as FeedbackAttachment['contentType'],
        size: photoEntry.size,
        buffer,
      },
    }
  }

  if (photoEntry !== null && typeof File !== 'undefined' && photoEntry instanceof File && photoEntry.size === 0) {
    return {
      category: formData.get('category'),
      message: formData.get('message'),
      pagePath: formData.get('pagePath'),
      pagePaths: formData.get('pagePaths'),
      attachment: null,
    }
  }

  if (photoEntry !== null) return { error: 'The attached photo is invalid.' }

  return {
    category: formData.get('category'),
    message: formData.get('message'),
    pagePath: formData.get('pagePath'),
    pagePaths: formData.get('pagePaths'),
    attachment: null,
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    return NextResponse.json({ error: 'You must be signed in to send feedback.' }, { status: 401 })
  }

  const parsed = await parseInput(request)
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const category = parsed.category
  const message = normalizeText(parsed.message, MAX_MESSAGE_LENGTH)
  const pagePath = normalizeText(parsed.pagePath, MAX_PAGE_PATH_LENGTH)
  const pagePaths = normalizePagePaths(parsed.pagePaths)

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

  if (profileError) console.warn('Feedback profile lookup failed; using auth fallback', profileError)

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
      page_paths: pagePaths.length ? pagePaths : null,
      attachment_filename: parsed.attachment?.filename ?? null,
      attachment_content_type: parsed.attachment?.contentType ?? null,
      attachment_size: parsed.attachment?.size ?? null,
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
        ${parsed.attachment ? '<p><strong>Photo:</strong> attached to this email.</p>' : ''}
        <hr />
        <h3>Reporter</h3>
        <p><strong>Name:</strong> ${escapeHtml(reporterName)}</p>
        <p><strong>Email:</strong> ${escapeHtml(reporterEmail)}</p>
        <p><strong>UID:</strong> ${escapeHtml(authData.user.id)}</p>
        ${pagePath ? `<p><strong>Page:</strong> ${escapeHtml(pagePath)}</p>` : ''}
        ${pagePaths.length ? `<p><strong>Selected pages:</strong> ${escapeHtml(pagePaths.map((page) => feedbackPageLabel(page)).join(', '))}</p>` : ''}
        <p><strong>Feedback ID:</strong> ${escapeHtml(feedback.id)}</p>
      `,
      attachments: parsed.attachment
        ? [{
            filename: parsed.attachment.filename,
            content: parsed.attachment.buffer,
            contentType: parsed.attachment.contentType,
          }]
        : undefined,
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
