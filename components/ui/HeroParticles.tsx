'use client'

import React, { useEffect, useRef } from 'react'

export default function HeroParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let particles: { x: number; y: number; size: number; speed: number; opacity: number }[] = []

    const init = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight

      particles = []
      const particleCount = 25
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 1, // 1px to 3px
          speed: Math.random() * 0.5 + 0.1, // 0.1 to 0.6 px per frame
          opacity: Math.random() * 0.1 + 0.05, // 0.05 to 0.15
        })
      }
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(200, 168, 85, ${p.opacity})` // #c8a855
        ctx.fill()

        // Move upward
        p.y -= p.speed
        
        // Slight horizontal drift
        p.x += Math.sin(p.y * 0.01) * 0.2

        // Wrap around
        if (p.y < -10) {
          p.y = canvas.height + 10
          p.x = Math.random() * canvas.width
        }
      }

      animationFrameId = requestAnimationFrame(draw)
    }

    init()
    draw()

    const handleResize = () => {
      init()
    }
    
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0"
      aria-hidden="true"
    />
  )
}
