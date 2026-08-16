'use client'

import { useEffect } from 'react'

interface QuizKeyboardControlsOptions {
  enabled: boolean
  options: readonly string[]
  correctAnswer: string
  canAnswer: boolean
  onAnswer: (option: string) => void
  canNext: boolean
  onNext: () => void
  canPrevious: boolean
  onPrevious: () => void
}

function isEditableTarget(target: EventTarget | null) {
  const element = target instanceof HTMLElement ? target : null
  return Boolean(element?.isContentEditable || element?.tagName === 'INPUT' || element?.tagName === 'TEXTAREA' || element?.tagName === 'SELECT')
}

function vibrateForCorrectAnswer() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return
  if (!window.isSecureContext) return
  const vibrate = navigator.vibrate
  if (typeof vibrate !== 'function') return
  try {
    // A short two-pulse pattern is easier to feel than a single 55ms pulse on Android.
    vibrate.call(navigator, [35, 24, 65])
  } catch {
    // Some browsers expose Vibration API but reject calls from unsupported contexts.
  }
}

export function useQuizKeyboardControls({
  enabled,
  options,
  correctAnswer,
  canAnswer,
  onAnswer,
  canNext,
  onNext,
  canPrevious,
  onPrevious,
}: QuizKeyboardControlsOptions) {
  useEffect(() => {
    if (!enabled) return

    function onKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return

      if (event.key === ' ' && canNext) {
        event.preventDefault()
        onNext()
        return
      }

      if (event.key === 'Backspace' && canPrevious) {
        event.preventDefault()
        onPrevious()
        return
      }

      if (!canAnswer) return
      const optionIndex = ['a', 'b', 'c', 'd'].indexOf(event.key.toLowerCase())
      if (optionIndex < 0 || !options[optionIndex]) return

      event.preventDefault()
      const option = options[optionIndex]
      if (option === undefined) return
      onAnswer(option)
      if (option === correctAnswer) vibrateForCorrectAnswer()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [canAnswer, canNext, canPrevious, correctAnswer, enabled, onAnswer, onNext, onPrevious, options])
}

export { vibrateForCorrectAnswer }
