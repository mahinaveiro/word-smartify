'use client'

import { createPortal } from 'react-dom'
import type { CSSProperties } from 'react'

const COLORS = ['#0f766e', '#e2552f', '#d89b00', '#3730a3', '#171717', '#0e7490']

const PARTICLES = Array.from({ length: 48 }, (_, index) => {
  const fromLeft = index % 2 === 0
  const distance = 32 + ((index * 17) % 38)
  const verticalTravel = -38 + ((index * 23) % 76)
  return {
    id: index,
    side: fromLeft ? 'left' : 'right',
    x: `${fromLeft ? distance : -distance}vw`,
    y: `${verticalTravel}vh`,
    delay: `${(index % 8) * 30}ms`,
    duration: `${920 + (index % 5) * 80}ms`,
    rotate: `${240 + (index % 7) * 75}deg`,
    color: COLORS[index % COLORS.length],
    top: `${24 + ((index * 19) % 52)}%`,
  }
})

type ConfettiStyle = CSSProperties & {
  '--confetti-x': string
  '--confetti-y': string
  '--confetti-rotate': string
  '--confetti-delay': string
  '--confetti-duration': string
}

export function CorrectAnswerCelebration() {
  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden" aria-hidden="true">
      {PARTICLES.map((particle) => (
        <span
          key={particle.id}
          className="quiz-confetti-piece"
          style={{
            top: particle.top,
            left: particle.side === 'left' ? '-8px' : undefined,
            right: particle.side === 'right' ? '-8px' : undefined,
            backgroundColor: particle.color,
            '--confetti-x': particle.x,
            '--confetti-y': particle.y,
            '--confetti-rotate': particle.rotate,
            '--confetti-delay': particle.delay,
            '--confetti-duration': particle.duration,
          } as ConfettiStyle}
        />
      ))}
    </div>,
    document.body,
  )
}
