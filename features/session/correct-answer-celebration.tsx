'use client'

import type { CSSProperties } from 'react'

const COLORS = ['#16b8aa', '#ff8b5c', '#ffd166', '#4f46e5', '#f4f1e8']

const PARTICLES = Array.from({ length: 30 }, (_, index) => {
  const fromLeft = index % 2 === 0
  const distance = 28 + ((index * 17) % 34)
  const verticalTravel = -34 + ((index * 23) % 82)
  return {
    id: index,
    side: fromLeft ? 'left' : 'right',
    x: `${fromLeft ? distance : -distance}vw`,
    y: `${verticalTravel}vh`,
    delay: `${(index % 6) * 35}ms`,
    duration: `${760 + (index % 5) * 70}ms`,
    rotate: `${240 + (index % 7) * 75}deg`,
    color: COLORS[index % COLORS.length],
    top: `${30 + ((index * 19) % 42)}%`,
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
  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden" aria-hidden="true">
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
    </div>
  )
}
