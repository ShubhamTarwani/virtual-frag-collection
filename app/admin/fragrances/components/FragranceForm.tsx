'use client'

import React, { useState } from 'react'
import { saveMasterFragrance } from '../actions'
import { MasterFragrance } from './FragranceTable'
import ImageUploader from '@/components/upload/ImageUploader'
import { BottleImage } from '@/components/ui/BottleImage'

type Props = {
  initialData?: MasterFragrance
  onClose: () => void
  onSuccess: () => void
}

export default function FragranceForm({ initialData, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState<Partial<MasterFragrance>>({
    name: initialData?.name || '',
    house: initialData?.house || '',
    family: initialData?.family || '',
    character: initialData?.character || '',
    projection: initialData?.projection || '',
    longevity: initialData?.longevity || '',
    season_tags: initialData?.season_tags || [],
    occasion_tags: initialData?.occasion_tags || [],
    top_notes: initialData?.top_notes || [],
    heart_notes: initialData?.heart_notes || [],
    base_notes: initialData?.base_notes || [],
    description: initialData?.description || '',
    release_year: initialData?.release_year || undefined,
    image_url: initialData?.image_url || '',
    cloudinary_public_id: initialData?.cloudinary_public_id || '',
    verified: initialData?.verified || false
  })

  const handleChange = (field: keyof MasterFragrance, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleArrayChange = (field: keyof MasterFragrance, value: string) => {
    const arr = value.split(',').map(s => s.trim()).filter(Boolean)
    handleChange(field, arr)
  }

  const handleAutoFill = async () => {
    if (!formData.name || !formData.house) {
      setError('Please provide Name and House before using AI Auto-fill.')
      return
    }
    setAiLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/autofill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, house: formData.house })
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Auto-fill failed')
      }
      const data = await res.json()
      setFormData(prev => ({ ...prev, ...data }))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setAiLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      // Basic validation
      if (!formData.name || !formData.house || !formData.family) {
        throw new Error('Name, House, and Family are required.')
      }

      await saveMasterFragrance(formData as any, initialData?.id)
      onSuccess()
    } catch (e: any) {
      setError(e.message)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="p-3 bg-red-500/10 text-red-500 rounded-xl text-sm font-medium">{error}</div>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Name *</label>
          <input className="w-full px-4 py-2 bg-background border border-border rounded-xl text-sm focus:border-accent focus:outline-none" value={formData.name} onChange={e => handleChange('name', e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">House *</label>
          <div className="flex gap-2">
            <input className="flex-1 px-4 py-2 bg-background border border-border rounded-xl text-sm focus:border-accent focus:outline-none" value={formData.house} onChange={e => handleChange('house', e.target.value)} required />
            <button type="button" onClick={handleAutoFill} disabled={aiLoading} className="px-3 py-2 bg-purple-500/10 text-purple-400 font-bold text-xs rounded-xl hover:bg-purple-500/20 whitespace-nowrap transition-colors border border-purple-500/20">
              {aiLoading ? '🤖...' : '🤖 AI Fill'}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Family *</label>
          <input className="w-full px-4 py-2 bg-background border border-border rounded-xl text-sm focus:border-accent focus:outline-none" value={formData.family} onChange={e => handleChange('family', e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Release Year</label>
          <input type="number" className="w-full px-4 py-2 bg-background border border-border rounded-xl text-sm focus:border-accent focus:outline-none" value={formData.release_year || ''} onChange={e => handleChange('release_year', e.target.value ? parseInt(e.target.value) : undefined)} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Description</label>
          <textarea rows={2} className="w-full px-4 py-2 bg-background border border-border rounded-xl text-sm focus:border-accent focus:outline-none" value={formData.description} onChange={e => handleChange('description', e.target.value)} />
        </div>
      </div>

      <div className="h-px bg-border/50" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Top Notes (comma separated)</label>
          <textarea rows={2} className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:border-accent focus:outline-none" value={formData.top_notes?.join(', ')} onChange={e => handleArrayChange('top_notes', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Heart Notes (comma separated)</label>
          <textarea rows={2} className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:border-accent focus:outline-none" value={formData.heart_notes?.join(', ')} onChange={e => handleArrayChange('heart_notes', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Base Notes (comma separated)</label>
          <textarea rows={2} className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:border-accent focus:outline-none" value={formData.base_notes?.join(', ')} onChange={e => handleArrayChange('base_notes', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Image / Bottle</label>
          {formData.cloudinary_public_id || formData.image_url ? (
            <div className="relative w-24 h-24 mb-2 rounded-xl overflow-hidden bg-background border border-border">
              <BottleImage publicId={formData.cloudinary_public_id || formData.image_url || ''} alt="Bottle" width={96} height={96} className="object-contain p-2 w-full h-full" />
              <button type="button" onClick={() => { handleChange('cloudinary_public_id', ''); handleChange('image_url', '') }} className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
            </div>
          ) : (
            <ImageUploader folder="master_bottles" onUploaded={(url, publicId) => { handleChange('image_url', url); handleChange('cloudinary_public_id', publicId) }} />
          )}
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Character & Performance</label>
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Character (e.g. Dark, Fresh)" className="px-3 py-2 bg-background border border-border rounded-xl text-sm focus:border-accent focus:outline-none" value={formData.character} onChange={e => handleChange('character', e.target.value)} />
              <input placeholder="Projection (e.g. Strong)" className="px-3 py-2 bg-background border border-border rounded-xl text-sm focus:border-accent focus:outline-none" value={formData.projection} onChange={e => handleChange('projection', e.target.value)} />
              <input placeholder="Longevity (e.g. 8 hours)" className="px-3 py-2 bg-background border border-border rounded-xl text-sm focus:border-accent focus:outline-none" value={formData.longevity} onChange={e => handleChange('longevity', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formData.verified} onChange={e => handleChange('verified', e.target.checked)} className="w-4 h-4 rounded text-accent focus:ring-accent bg-background border-border" />
              <span className="text-sm font-semibold text-foreground">Verified Master Entry</span>
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <button type="button" onClick={onClose} disabled={loading} className="px-5 py-2 rounded-xl text-sm font-bold text-muted hover:text-foreground transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="px-5 py-2 bg-accent text-background rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">
          {loading ? 'Saving...' : 'Save Fragrance'}
        </button>
      </div>
    </form>
  )
}
