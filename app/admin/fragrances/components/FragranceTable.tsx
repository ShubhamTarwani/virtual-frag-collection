'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toggleVerifiedStatus, deleteMasterFragrance } from '../actions'
import FragranceForm from './FragranceForm'

export type MasterFragrance = {
  id: string
  name: string
  house: string
  family: string
  verified: boolean
  cloudinary_public_id?: string
  image_url?: string
  // other fields...
  character?: string
  projection?: string
  longevity?: string
  description?: string
  release_year?: number
  season_tags?: string[]
  occasion_tags?: string[]
  top_notes?: string[]
  heart_notes?: string[]
  base_notes?: string[]
}

export default function FragranceTable({ data }: { data: MasterFragrance[] }) {
  const [search, setSearch] = useState('')
  const [filterFamily, setFilterFamily] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const router = useRouter()

  const families = Array.from(new Set(data.map(d => d.family))).filter(Boolean)

  const filtered = data.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) || d.house.toLowerCase().includes(search.toLowerCase())
    const matchFamily = filterFamily ? d.family === filterFamily : true
    return matchSearch && matchFamily
  })

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete ${name} from master database? This cannot be undone.`)) return
    setLoadingId(id)
    try {
      await deleteMasterFragrance(id)
      router.refresh()
    } catch (e) {
      alert('Error deleting fragrance')
    } finally {
      setLoadingId(null)
    }
  }

  const handleToggleVerified = async (id: string, current: boolean) => {
    setLoadingId(id)
    try {
      await toggleVerifiedStatus(id, current)
      router.refresh()
    } catch (e) {
      alert('Error toggling status')
    } finally {
      setLoadingId(null)
    }
  }

  const editItem = data.find(d => d.id === editingId)

  return (
    <div>
      <div className="p-4 border-b border-border bg-surface-hover/30 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-4 flex-1">
          <input
            type="text"
            placeholder="Search name or house..."
            className="w-full max-w-xs px-4 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-accent"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="px-4 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-accent"
            value={filterFamily}
            onChange={(e) => setFilterFamily(e.target.value)}
          >
            <option value="">All Families</option>
            {families.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="px-4 py-2 bg-accent text-background rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
        >
          + Add New
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-surface-hover/50 text-muted uppercase text-xs">
            <tr>
              <th className="px-6 py-4 font-semibold">Fragrance</th>
              <th className="px-6 py-4 font-semibold">House</th>
              <th className="px-6 py-4 font-semibold">Family</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filtered.map(f => (
              <tr key={f.id} className="hover:bg-surface-hover/30 transition-colors">
                <td className="px-6 py-4 font-medium text-foreground">{f.name}</td>
                <td className="px-6 py-4 text-muted">{f.house}</td>
                <td className="px-6 py-4 text-muted">{f.family}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleToggleVerified(f.id, f.verified)}
                    disabled={loadingId === f.id}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                      f.verified 
                        ? 'bg-accent/10 border-accent/20 text-accent hover:bg-accent/20' 
                        : 'bg-surface border-border text-muted hover:text-foreground'
                    }`}
                  >
                    {f.verified && <span>✓</span>} {f.verified ? 'Verified' : 'Unverified'}
                  </button>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => setEditingId(f.id)} className="text-muted hover:text-foreground px-2 py-1">Edit</button>
                  <button onClick={() => handleDelete(f.id, f.name)} className="text-red-500 hover:text-red-400 px-2 py-1">Delete</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-muted">No fragrances found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {(isAdding || editingId) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => { setIsAdding(false); setEditingId(null) }} />
          <div className="relative w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold font-serif mb-6">{isAdding ? 'Add Master Fragrance' : 'Edit Master Fragrance'}</h2>
              <FragranceForm 
                initialData={editItem} 
                onClose={() => { setIsAdding(false); setEditingId(null) }} 
                onSuccess={() => { setIsAdding(false); setEditingId(null); router.refresh() }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
