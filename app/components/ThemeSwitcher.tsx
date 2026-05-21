"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

const themes = [
  { id: "default", name: "Midnight Mahogany" },
  { id: "theme-marble", name: "Carrara Marble" },
  { id: "theme-glass", name: "Smoked Glass" },
  { id: "theme-oak", name: "Aged Oak" },
  { id: "theme-metal", name: "Brushed Metal" },
]

export default function ThemeSwitcher() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTheme, setActiveTheme] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("fragrance-theme")
      if (saved && themes.find(t => t.id === saved)) return saved
    }
    return "default"
  })

  // Prevent hydration mismatch
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
    if (activeTheme !== "default") {
      document.body.classList.add(activeTheme)
    }
  }, [activeTheme])

  const applyTheme = (themeId: string) => {
    // Remove old themes
    themes.forEach(t => {
      if (t.id !== "default") {
        document.body.classList.remove(t.id)
      }
    })
    
    // Add new theme
    if (themeId !== "default") {
      document.body.classList.add(themeId)
    }
    
    setActiveTheme(themeId)
    localStorage.setItem("fragrance-theme", themeId)
    setIsOpen(false)
  }

  if (!mounted) return null

  return (
    <div className="absolute top-6 right-6 z-50">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full border border-border bg-surface/80 px-4 py-2 text-xs font-medium text-muted backdrop-blur-md transition-all hover:border-accent hover:text-accent shadow-sm hover:shadow-md"
      >
        <span className="w-2 h-2 rounded-full bg-accent" />
        {themes.find(t => t.id === activeTheme)?.name || "Theme"}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-surface/95 shadow-2xl backdrop-blur-lg"
          >
            <div className="flex flex-col py-1">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => applyTheme(theme.id)}
                  className={`px-4 py-2.5 text-left text-xs transition-colors hover:bg-surface-hover ${
                    activeTheme === theme.id ? "text-accent font-medium bg-accent/5" : "text-foreground"
                  }`}
                >
                  {theme.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
