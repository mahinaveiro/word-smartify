'use client'

import { track } from '@vercel/analytics'

export type ProductEvent =
  | 'dashboard_viewed'
  | 'today_action_opened'
  | 'learning_session_started'
  | 'learning_session_completed'
  | 'review_started'
  | 'review_completed'
  | 'weak_drill_started'
  | 'weak_drill_completed'
  | 'answer_submitted'
  | 'mock_test_started'
  | 'mock_test_completed'
  | 'onboarding_completed'

export type ProductEventProperties = Record<string, string | number | boolean | null | undefined>

/**
 * Product analytics stays deliberately small and contains no user identifiers,
 * words, answers, or private content. It is safe to call from client surfaces;
 * Vercel Analytics handles disabled/development environments.
 */
export function trackProductEvent(name: ProductEvent, properties?: ProductEventProperties) {
  try {
    track(name, properties)
  } catch {
    // Analytics must never interrupt a learning session.
  }
}
