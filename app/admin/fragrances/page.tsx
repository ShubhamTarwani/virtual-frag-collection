import { createClient } from '@supabase/supabase-js'
import React from 'react'
import FragranceTable from './components/FragranceTable'

export default async function AdminFragrancesPage() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: fragrances, error } = await supabaseAdmin
    .from('master_fragrances')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    return <div className="p-8 text-red-500">Error loading master fragrances: {error.message}</div>
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-serif text-foreground">Master Fragrance Database</h1>
        <p className="text-muted mt-2">Manage the reference list of fragrances used for auto-filling user collections.</p>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <FragranceTable data={fragrances || []} />
      </div>
    </div>
  )
}
