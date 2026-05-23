'use client'

import React, { useEffect, useState, useRef } from 'react'

export default function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)
  const [isBottleHovering, setIsBottleHovering] = useState(false)
  const [hidden, setHidden] = useState(true)
  
  const cursorRef = useRef<HTMLDivElement>(null)
  
  // For smooth lerp trailing
  const mouse = useRef({ x: 0, y: 0 })
  const renderPos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    // Check if we're on a touch device, if so don't render custom cursor
    if (typeof window !== 'undefined' && window.matchMedia('(hover: none) and (pointer: coarse)').matches) {
      return
    }

    const onMouseMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY }
      if (hidden) setHidden(false)
    }

    const onMouseLeave = () => setHidden(true)
    const onMouseEnter = () => setHidden(false)

    // Interactive element detection
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      
      // Check for bottle card first
      const bottleCard = target.closest('[data-fragrance-card]')
      if (bottleCard) {
        setIsBottleHovering(true)
        setIsHovering(false)
        return
      }
      
      setIsBottleHovering(false)

      // Check for generic interactives
      const isInteractive = target.closest('a, button, [role="button"], input, select, textarea')
      if (isInteractive) {
        setIsHovering(true)
      } else {
        setIsHovering(false)
      }
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseleave', onMouseLeave)
    window.addEventListener('mouseenter', onMouseEnter)
    window.addEventListener('mouseover', handleMouseOver)

    let animationFrameId: number

    const render = () => {
      renderPos.current.x += (mouse.current.x - renderPos.current.x) * 0.15
      renderPos.current.y += (mouse.current.y - renderPos.current.y) * 0.15

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${renderPos.current.x}px, ${renderPos.current.y}px, 0)`
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseleave', onMouseLeave)
      window.removeEventListener('mouseenter', onMouseEnter)
      window.removeEventListener('mouseover', handleMouseOver)
      cancelAnimationFrame(animationFrameId)
    }
  }, [hidden])

  if (hidden) return null

  return (
    <div
      ref={cursorRef}
      className="fixed top-0 left-0 pointer-events-none z-[9999]"
      style={{
        width: 0,
        height: 0,
      }}
    >
      {/* 
        Container for the cursor visuals, centered on the coordinates.
        Using transitions for smooth state morphs.
      */}
      <div 
        className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-300 ease-out"
        style={{
          width: isBottleHovering ? '24px' : isHovering ? '36px' : '10px',
          height: isBottleHovering ? '24px' : isHovering ? '36px' : '10px',
        }}
      >
        {isBottleHovering ? (
          // SVG Perfume Bottle
          <svg width="12" height="24" viewBox="0 0 12 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#c8a855] drop-shadow-md">
            {/* Cap */}
            <path d="M4 2H8V5H4V2Z" fill="currentColor" />
            <path d="M5 0H7V2H5V0Z" fill="currentColor" opacity="0.8"/>
            {/* Neck */}
            <path d="M4.5 5H7.5V7H4.5V5Z" fill="currentColor" opacity="0.7"/>
            {/* Body */}
            <path d="M1 7H11C11.5523 7 12 7.44772 12 8V22C12 23.1046 11.1046 24 10 24H2C0.89543 24 0 23.1046 0 22V8C0 7.44772 0.447715 7 1 7Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
            {/* Liquid */}
            <path d="M1.5 12H10.5V22C10.5 22.5523 10.0523 23 9.5 23H2.5C1.94772 23 1.5 22.5523 1.5 22V12Z" fill="currentColor" opacity="0.4"/>
          </svg>
        ) : (
          <>
            {/* Inner Dot */}
            <div 
              className="absolute bg-[#c8a855] rounded-full transition-all duration-300 ease-out shadow-sm shadow-[#c8a855]/30"
              style={{
                width: isHovering ? '4px' : '10px',
                height: isHovering ? '4px' : '10px',
              }}
            />
            {/* Expanding Outer Ring */}
            <div 
              className="absolute border border-[#c8a855] rounded-full transition-all duration-300 ease-out"
              style={{
                width: isHovering ? '36px' : '0px',
                height: isHovering ? '36px' : '0px',
                opacity: isHovering ? 0.6 : 0,
              }}
            />
          </>
        )}
      </div>
    </div>
  )
}
