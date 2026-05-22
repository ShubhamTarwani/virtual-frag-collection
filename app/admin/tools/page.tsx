import { createClient } from '@supabase/supabase-js'
import React from 'react'
import { getMissingMetadataCount } from './actions'
import BulkAiTool from './components/BulkAiTool'

export default async function AdminToolsPage() {
  const missingCount = await getMissingMetadataCount()

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch insights
  const { data: perfumes } = await supabaseAdmin.from('perfumes').select('brand, category')

  const houseCount: Record<string, number> = {}
  const familyCount: Record<string, number> = {}

  perfumes?.forEach(p => {
    if (p.brand) houseCount[p.brand] = (houseCount[p.brand] || 0) + 1
    if (p.category) familyCount[p.category] = (familyCount[p.category] || 0) + 1
  })

  const topHouses = Object.entries(houseCount).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const topFamilies = Object.entries(familyCount).sort((a, b) => b[1] - a[1]).slice(0, 5)

  // Wishlists are perfumes with shelf_row = -1 (assuming wishlists work this way, or we just show counts)
  const { data: wishlisted } = await supabaseAdmin.from('perfumes').select('name, brand').eq('shelf_row', -1)
  const wishlistCount: Record<string, number> = {}
  wishlisted?.forEach(p => {
    const key = `${p.name} by ${p.brand}`
    wishlistCount[key] = (wishlistCount[key] || 0) + 1
  })
  const topWishlisted = Object.entries(wishlistCount).sort((a, b) => b[1] - a[1]).slice(0, 5)

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-serif text-foreground">Admin Tools</h1>
        <p className="text-muted mt-2">Platform-wide utilities and AI bulk processing.</p>
      </div>

      <BulkAiTool initialCount={missingCount} />

      <div>
        <h2 className="text-xl font-bold font-serif text-foreground mb-4">Collection Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">Top Houses</h3>
            <ul className="space-y-3">
              {topHouses.map(([house, count], i) => (
                <li key={house} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{i+1}. {house}</span>
                  <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-1 rounded-full">{count}</span>
                </li>
              ))}
              {topHouses.length === 0 && <li className="text-sm text-muted">No data.</li>}
            </ul>
          </div>

          <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">Top Families</h3>
            <ul className="space-y-3">
              {topFamilies.map(([family, count], i) => (
                <li key={family} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{i+1}. {family}</span>
                  <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-1 rounded-full">{count}</span>
                </li>
              ))}
              {topFamilies.length === 0 && <li className="text-sm text-muted">No data.</li>}
            </ul>
          </div>

          <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">Most Wishlisted</h3>
            <ul className="space-y-3">
              {topWishlisted.map(([item, count], i) => (
                <li key={item} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground truncate mr-2" title={item}>{i+1}. {item}</span>
                  <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-1 rounded-full shrink-0">{count}</span>
                </li>
              ))}
              {topWishlisted.length === 0 && <li className="text-sm text-muted">No data.</li>}
            </ul>
          </div>

        </div>
      </div>
    </div>
  )
}
