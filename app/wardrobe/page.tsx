import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import WardrobeClient from '@/components/wardrobe/WardrobeClient'

export default async function WardrobePage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <WardrobeClient />
    </main>
  )
}
