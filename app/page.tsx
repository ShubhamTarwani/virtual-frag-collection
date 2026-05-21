"use client"

import PerfumeShelf from "./components/PerfumeShelf"

import { motion } from "framer-motion"

export default function Home() {
  return (
    <div className="flex flex-col flex-1 bg-transparent font-sans">
      {/* Hero header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative overflow-hidden border-b border-border bg-surface/30 backdrop-blur-sm"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-accent/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative mx-auto max-w-6xl px-6 py-14 sm:py-20 text-center flex flex-col items-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="flex items-center gap-3 mb-6"
          >
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-accent to-transparent" />
            <p className="text-xs font-semibold tracking-[0.3em] uppercase text-accent">
              Personal Collection
            </p>
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-accent to-transparent" />
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-4xl sm:text-6xl font-bold tracking-tight text-foreground font-serif leading-tight"
          >
            Virtual Fragrance Shelf
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mt-6 text-sm sm:text-base text-muted max-w-lg mx-auto leading-relaxed"
          >
            A curated display of my perfume collection. Browse by type, occasion, scent profile, or individual notes.
          </motion.p>
        </div>
      </motion.header>

      {/* Main content */}
      <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-8">
        <PerfumeShelf />
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center">
        <p className="text-xs text-muted">
          Built with passion for fragrances
        </p>
      </footer>
    </div>
  )
}
