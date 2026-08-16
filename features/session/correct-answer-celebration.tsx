'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

const COLORS = ['#0f766e', '#e2552f', '#d89b00', '#3730a3', '#171717', '#0e7490', '#f4c95d']
const DURATION_MS = 1500

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  width: number
  height: number
  rotation: number
  rotationSpeed: number
  color: string
  opacity: number
}

function createParticles(width: number, height: number): Particle[] {
  return Array.from({ length: 88 }, (_, index) => {
    const fromLeft = index % 2 === 0
    const originY = height * (0.16 + ((index * 19) % 68) / 100)
    return {
      x: fromLeft ? -12 : width + 12,
      y: originY,
      vx: (fromLeft ? 1 : -1) * (4.5 + Math.random() * 5.5),
      vy: (Math.random() - 0.5) * 7,
      width: 6 + Math.random() * 7,
      height: 10 + Math.random() * 12,
      rotation: Math.random() * Math.PI,
      rotationSpeed: (Math.random() - 0.5) * 0.28,
      color: COLORS[index % COLORS.length],
      opacity: 1,
    }
  })
}

export function CorrectAnswerCelebration() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    let frame = 0
    let animationFrame = 0
    const startedAt = performance.now()

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(window.innerWidth * ratio)
      canvas.height = Math.floor(window.innerHeight * ratio)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
    }

    resize()
    window.addEventListener('resize', resize)
    const particles = createParticles(window.innerWidth, window.innerHeight)

    function draw(now: number) {
      const elapsed = now - startedAt
      const progress = Math.min(elapsed / DURATION_MS, 1)
      const width = window.innerWidth
      const height = window.innerHeight
      context.clearRect(0, 0, width, height)

      for (const particle of particles) {
        particle.x += particle.vx
        particle.y += particle.vy
        particle.vy += 0.12
        particle.vx *= 0.994
        particle.rotation += particle.rotationSpeed
        particle.opacity = Math.max(0, 1 - Math.max(0, progress - 0.55) / 0.45)

        context.save()
        context.globalAlpha = particle.opacity
        context.translate(particle.x, particle.y)
        context.rotate(particle.rotation)
        context.fillStyle = particle.color
        context.fillRect(-particle.width / 2, -particle.height / 2, particle.width, particle.height)
        context.restore()
      }

      if (progress < 1) {
        animationFrame = requestAnimationFrame(draw)
      }
    }

    animationFrame = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(frame)
    }
  }, [])

  if (typeof document === 'undefined') return null

  return createPortal(
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[9999] h-full w-full"
    />,
    document.body,
  )
}
