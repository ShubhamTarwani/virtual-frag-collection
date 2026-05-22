import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Wardrobe · What should I wear today?',
  description: 'AI-powered fragrance recommendation based on today\'s weather, time, and your context.',
}

export default function WardrobeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
