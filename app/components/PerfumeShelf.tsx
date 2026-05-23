"use client"
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useState } from 'react'
import { type User } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/client'
import { motion } from 'framer-motion'
import ImageUploader from '@/components/upload/ImageUploader'
import MasonryGrid from './MasonryGrid'
import DetailDrawer from './DetailDrawer'
import { samplePerfumes } from './sampleData'
import { BottleImage } from '@/components/ui/BottleImage'
import AccountNumberBadge from '@/components/ui/AccountNumberBadge'

export type Perfume = {
  id: string
  name?: string
  brand?: string
  category?: string
  concentration?: string
  image_url?: string
  cloudinary_public_id?: string
  shelf_row?: number
  occasion?: string
  notes?: string
  rating?: number
  longevity_hours?: number
  ideal_season?: string
  derivedType?: string
  derivedOccasion?: string
  derivedSmell?: string
  derivedNote?: string
}

const filterModes = ['Type', 'Occasion', 'Smell', 'Notes'] as const
const typeOptions = ['All', 'Niche', 'Designer', 'Middle Eastern', 'Mass Produced', 'Clones', 'Liquid Deodorants', 'Other']
const occasionOptions = ['All', 'Date Night', 'Meeting', 'Casual', 'Evening', 'Office', 'Party']
const smellOptions = ['All', 'Gourmand', 'Fresh', 'Aquatic', 'Floral', 'Woody', 'Oriental', 'Spicy']
const notesOptions = ['All', 'Vanilla', 'Honey', 'Oud', 'Rose', 'Citrus', 'Amber', 'Leather', 'Musk', 'Sandalwood']

const designerBrands = new Set([
  'armani', 'calvin klein', 'ck', 'davidoff', 'dior', 'versace', 'paco rabanne', 'paco',
  'guess', 'chanel', 'tom ford', 'yves saint laurent', 'ysl', 'prada', 'gucci', 'hermes',
  'burberry', 'hugo boss', 'boss', 'dolce & gabbana', 'dolce and gabbana', 'd&g',
  'jean paul gaultier', 'jpg', 'givenchy', 'bvlgari', 'valentino', 'ralph lauren', 'mugler',
  'carolina herrera', 'azzaro', 'montblanc', 'giorgio armani', 'creed', 'tommy hilfiger',
  'issey miyake', 'narciso rodriguez', 'viktor & rolf', 'viktor and rolf'
])

const massProducedBrands = new Set([
  'coty', 'loreal', 'estee lauder', 'revlon', 'avon', 'bath & body works', 'victoria\'s secret',
  'zara', 'h&m', 'old spice', 'axe', 'lynx', 'guerlain', 'lancome', 'chopard'
])

const middleEasternBrands = new Set([
  'lattafa', 'afnan', 'armaf', 'rasasi', 'swiss arabian', 'ajmal', 'al haramain', 
  'fragrance world', 'paris corner', 'asdaaf', 'khalis', 'emir'
])

const cloneBrands = new Set(['dupe', 'alt', 'clone', 'xxx collection', 'dossier', 'dua', 'alexandria', 'oakcha'])

function classifyPerfume(p: Perfume) {
  const brand = (p.brand || '').toLowerCase()
  const name = (p.name || '').toLowerCase()
  const category = (p.category || '').toLowerCase()

  if (category.includes('liquid deodorant') || category.includes('liquid deodrant') || name.includes('liquid deodorant') || name.includes('liquid deodrant') || category.includes('dry down') || name.includes('dry down')) return 'Liquid Deodorants'

  if (cloneBrands.has(brand) || name.includes('clone') || name.includes('dupe') || name.includes('alt')) return 'Clones'
  
  if (middleEasternBrands.has(brand) || category.includes('middle eastern') || category.includes('oriental')) return 'Middle Eastern'
  
  if (category.includes('niche')) return 'Niche'
  if (category.includes('designer')) return 'Designer'
  if (category.includes('mass produced')) return 'Mass Produced'

  if (designerBrands.has(brand)) return 'Designer'
  if (massProducedBrands.has(brand)) return 'Mass Produced'
  if (brand && brand.length > 0) return 'Niche'
  
  return 'Other'
}

function classifyOccasion(p: Perfume) {
  const text = `${p.occasion || ''} ${p.category || ''} ${p.name || ''} ${p.notes || ''}`.toLowerCase()
  if (/date night|romantic|dinner|intimate|evening|night out/i.test(text)) return 'Date Night'
  if (/meeting|office|work|business|professional/i.test(text)) return 'Meeting'
  if (/party|club|celebration|festive/i.test(text)) return 'Party'
  if (/casual|daily|everyday|weekend/i.test(text)) return 'Casual'
  if (/evening|night|dinner/i.test(text)) return 'Evening'
  return p.occasion ? p.occasion : 'Other'
}

function classifySmell(p: Perfume) {
  const text = `${p.category || ''} ${p.name || ''} ${p.notes || ''}`.toLowerCase()
  if (/gourmand|sweet|vanilla|caramel|chocolate|cocoa/i.test(text)) return 'Gourmand'
  if (/fresh|clean|citrus|green|ozone/i.test(text)) return 'Fresh'
  if (/aquatic|marine|ocean|sea|water/i.test(text)) return 'Aquatic'
  if (/floral|rose|jasmine|lily|peony|orchid/i.test(text)) return 'Floral'
  if (/woody|cedar|sandalwood|vetiver|patchouli|oakmoss/i.test(text)) return 'Woody'
  if (/oriental|amber|oud|incense|resin|spice/i.test(text)) return 'Oriental'
  if (/spice|pepper|cinnamon|cardamom|clove/i.test(text)) return 'Spicy'
  return 'Other'
}

function classifyNote(p: Perfume) {
  const text = `${p.notes || ''} ${p.name || ''} ${p.category || ''}`.toLowerCase()
  if (text.includes('vanilla')) return 'Vanilla'
  if (text.includes('honey')) return 'Honey'
  if (text.includes('oud') || text.includes('oudh')) return 'Oud'
  if (text.includes('rose')) return 'Rose'
  if (text.includes('citrus') || text.includes('orange') || text.includes('bergamot') || text.includes('lemon')) return 'Citrus'
  if (text.includes('amber')) return 'Amber'
  if (text.includes('leather')) return 'Leather'
  if (text.includes('musk')) return 'Musk'
  if (text.includes('sandalwood') || text.includes('sandal')) return 'Sandalwood'
  return 'Other'
}

function getFilterOptions(mode: typeof filterModes[number]) {
  switch (mode) {
    case 'Type':
      return typeOptions
    case 'Occasion':
      return occasionOptions
    case 'Smell':
      return smellOptions
    case 'Notes':
      return notesOptions
  }
}

function getDerivedValue(p: Perfume, mode: typeof filterModes[number]) {
  switch (mode) {
    case 'Type':
      return p.derivedType || classifyPerfume(p)
    case 'Occasion':
      return p.derivedOccasion || classifyOccasion(p)
    case 'Smell':
      return p.derivedSmell || classifySmell(p)
    case 'Notes':
      return p.derivedNote || classifyNote(p)
  }
}

function matchesFilter(p: Perfume, mode: typeof filterModes[number], value: string) {
  if (value === 'All') return true
  const derivedValue = getDerivedValue(p, mode)
  return derivedValue === value || (mode === 'Notes' && (p.notes || '').toLowerCase().includes(value.toLowerCase()))
}

const sortOrder: Record<string, number> = {
  Niche: 1,
  Designer: 2,
  'Middle Eastern': 3,
  'Mass Produced': 4,
  Clones: 5,
  'Liquid Deodorants': 6,
  Gourmand: 7,
  Fresh: 8,
  Aquatic: 9,
  Floral: 10,
  Woody: 11,
  Oriental: 12,
  Spicy: 13,
  'Date Night': 14,
  Meeting: 15,
  Casual: 16,
  Evening: 17,
  Office: 18,
  Party: 19,
  Vanilla: 19,
  Honey: 20,
  Oud: 21,
  Rose: 22,
  Citrus: 23,
  Amber: 24,
  Leather: 25,
  Musk: 26,
  Sandalwood: 27,
  Other: 99,
}

export default function PerfumeShelf() {
  const supabase = createClient()
  const [perfumes, setPerfumes] = useState<Perfume[]>([])
  const [loading, setLoading] = useState(true)
  const [filterMode, setFilterMode] = useState<typeof filterModes[number]>('Type')
  const [activeFilter, setActiveFilter] = useState('All')
  const [autoSort, setAutoSort] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<{ account_number: number | null } | null>(null)
  const [adminOpen, setAdminOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [viewMode, setViewMode] = useState<'Categorized' | 'Master Wall' | 'Masonry'>('Categorized')
  const [isAutofilling, setIsAutofilling] = useState(false)

  const [selectedPerfume, setSelectedPerfume] = useState<Perfume | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [formValues, setFormValues] = useState({
    name: '', brand: '', category: '', concentration: '', image_url: '', cloudinary_public_id: '', shelf_row: '0', occasion: '', notes: '', rating: '', longevity_hours: '', ideal_season: '', isLiquidDeo: false
  })


  const handleAutofill = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!formValues.name || !formValues.brand) {
      alert("Please enter both Name and Brand before auto-fetching.")
      return
    }
    
    setIsAutofilling(true)
    try {
      const res = await fetch('/api/autofill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formValues.name, brand: formValues.brand, isLiquidDeo: formValues.isLiquidDeo })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to auto-fetch details')
      }
      
      setFormValues(prev => ({
        ...prev,
        category: data.category || prev.category,
        occasion: data.occasion || prev.occasion,
        notes: data.notes || prev.notes,
        concentration: data.concentration || prev.concentration,
        rating: data.rating ? String(data.rating) : prev.rating,
        longevity_hours: data.longevity_hours ? String(data.longevity_hours) : prev.longevity_hours,
        ideal_season: data.ideal_season || prev.ideal_season
      }))
      
    } catch (err: unknown) {
      console.error(err)
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during auto-fetch'
      alert(errorMessage)
    } finally {
      setIsAutofilling(false)
    }
  }

  const fetchPerfumes = async (userId: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('perfumes').select('*').eq('user_id', userId).order('shelf_row', { ascending: true })
      if (error) {
        console.error('Supabase fetch error:', error)
        setPerfumes([])
      } else {
        setPerfumes((data as Perfume[]) || [])
      }
    } catch (err) {
      console.error('Unexpected fetch error:', err)
      setPerfumes([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true

    const initialize = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        const currentUser = data?.session?.user || null
        if (!error && mounted && currentUser) {
          setUser(currentUser)
          const { data: profile } = await supabase.from('profiles').select('account_number').eq('id', currentUser.id).single()
          if (profile) setUserProfile(profile)
        }
        await fetchPerfumes(currentUser?.id || '')
      } catch (err) {
        console.error('Supabase auth session error:', err)
        await fetchPerfumes('')
      }
    }

    initialize()
    return () => {
      mounted = false
    }
  }, [])

  const handleSignIn = async () => {
    setAuthError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setAuthError(error.message)
      return
    }
    if (data.session?.user) {
      setUser(data.session.user)
      setPassword('')
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setUserProfile(null)
    setAuthError('')
    setEditId(null)
    setFormValues({
      name: '',
      brand: '',
      category: '',
      concentration: '',
      image_url: '',
      cloudinary_public_id: '',
      shelf_row: '0',
      occasion: '',
      notes: '',
      rating: '',
      longevity_hours: '',
      ideal_season: '',
      isLiquidDeo: false,
    })
  }

  const setFormField = (field: keyof typeof formValues, value: string | boolean) => {
    setFormValues((prev) => ({ ...prev, [field]: value }))
  }

  const startEditing = (perfume: Perfume) => {
    setAdminOpen(true)
    setEditId(perfume.id)
    setFormValues({
      name: perfume.name || '',
      brand: perfume.brand || '',
      category: perfume.category || '',
      concentration: perfume.concentration || '',
      image_url: perfume.image_url || '',
      cloudinary_public_id: perfume.cloudinary_public_id || '',
      shelf_row: String(perfume.shelf_row ?? 0),
      occasion: perfume.occasion || '',
      notes: perfume.notes || '',
      rating: perfume.rating != null ? String(perfume.rating) : '',
      longevity_hours: perfume.longevity_hours != null ? String(perfume.longevity_hours) : '',
      ideal_season: perfume.ideal_season || '',
      isLiquidDeo: perfume.category?.toLowerCase().includes('liquid deodorant') || false,
    })
  }

  const resetForm = () => {
    setEditId(null)
    setFormValues({
      name: '',
      brand: '',
      category: '',
      concentration: '',
      image_url: '',
      cloudinary_public_id: '',
      shelf_row: '0',
      occasion: '',
      notes: '',
      rating: '',
      longevity_hours: '',
      ideal_season: '',
      isLiquidDeo: false,
    })
  }

  const savePerfume = async () => {
    const payload: Record<string, unknown> = {
      name: formValues.name,
      brand: formValues.brand,
      category: formValues.category,
      concentration: formValues.concentration,
      image_url: formValues.image_url,
      cloudinary_public_id: formValues.cloudinary_public_id,
      shelf_row: Number(formValues.shelf_row) || 0,
      occasion: formValues.occasion,
      notes: formValues.notes,
    }
    if (formValues.rating) payload.rating = Number(formValues.rating)
    if (formValues.longevity_hours) payload.longevity_hours = Number(formValues.longevity_hours)
    if (formValues.ideal_season) payload.ideal_season = formValues.ideal_season

    if (!editId && user) {
      payload.user_id = user.id
    }

    const action = editId
      ? supabase.from('perfumes').update(payload).eq('id', editId)
      : supabase.from('perfumes').insert([payload])

    const { error } = await action
    if (error) {
      console.error('Supabase save error:', error)
      return
    }

    await fetchPerfumes(user?.id || '')
    resetForm()
  }

  const deletePerfume = async (id: string) => {
    const { error } = await supabase.from('perfumes').delete().eq('id', id)
    if (error) {
      console.error('Supabase delete error:', error)
      return
    }

    if (editId === id) {
      resetForm()
    }
    await fetchPerfumes(user?.id || '')
  }

  const withDerived = perfumes.map((p) => ({
    ...p,
    derivedType: classifyPerfume(p),
    derivedOccasion: classifyOccasion(p),
    derivedSmell: classifySmell(p),
    derivedNote: classifyNote(p),
  }))

  const filtered = withDerived.filter((p) => matchesFilter(p, filterMode, activeFilter))

  const grouped = new Map<string, Perfume[]>()
  if (autoSort) {
    filtered.forEach((p) => {
      const groupKey = getDerivedValue(p, filterMode) || 'Other'
      const arr = grouped.get(groupKey) || []
      arr.push(p)
      grouped.set(groupKey, arr)
    })
  } else {
    filtered.forEach((p) => {
      const row = typeof p.shelf_row === 'number' ? p.shelf_row : 0
      const arr = grouped.get(String(row)) || []
      arr.push(p)
      grouped.set(String(row), arr)
    })
  }

  const groupEntries = Array.from(grouped.entries()).sort((a, b) => {
    if (!autoSort) return Number(a[0]) - Number(b[0])
    return (sortOrder[a[0]] ?? 50) - (sortOrder[b[0]] ?? 50)
  })

  const activeOptions = getFilterOptions(filterMode)

  return (
    <div className="w-full space-y-8">
      <section className="rounded-3xl border border-border bg-surface/90 p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-lg font-semibold">Manage your collection</h2>
              {userProfile?.account_number !== null && userProfile?.account_number !== undefined && (
                <div title={`Collector #${userProfile.account_number.toString().padStart(4, '0')} — joined among the first ${Math.max(userProfile.account_number, 1)} members`}>
                  <AccountNumberBadge number={userProfile.account_number} size="sm" />
                </div>
              )}
            </div>
            <p className="text-sm text-muted">Sign in to edit your fragrance shelf, add new bottles, and organize your collection.</p>
          </div>
          <button onClick={() => setAdminOpen((open) => !open)} className="rounded-2xl bg-accent px-4 py-2 text-sm text-background transition hover:bg-surface-hover">
            {adminOpen ? 'Hide collection manager' : user ? 'Manage collection' : 'Open login'}
          </button>
        </div>

        {adminOpen ? (
          <div className="space-y-4">
            {!user ? (
              <div className="grid gap-4 sm:grid-cols-[1fr_auto] items-end">
                <div className="grid gap-3">
                  <label className="text-sm text-foreground">
                    Email
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-border-light bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                  </label>
                  <label className="text-sm text-foreground">
                    Password
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-border-light bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                  </label>
                </div>
                <div className="flex flex-col items-start gap-3 sm:items-end">
                  <button
                    onClick={handleSignIn}
                    className="rounded-2xl bg-accent px-5 py-2 text-sm text-background transition hover:bg-surface-hover"
                  >
                    Sign in
                  </button>
                  {authError ? <div className="text-sm text-danger">{authError}</div> : null}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-muted">
                    Signed in as <span className="font-semibold text-foreground">{user.email}</span>
                  </p>
                  <p className="text-sm text-muted">Editing is protected. Public visitors can still browse the shelf below.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={resetForm}
                    className="rounded-2xl border border-border-light bg-surface px-4 py-2 text-sm text-foreground transition hover:bg-surface-hover"
                  >
                    New bottle
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="rounded-2xl bg-accent px-4 py-2 text-sm text-background transition hover:bg-surface-hover"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}

            {user ? (
              <div className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr]">
                <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
                  <div className="grid gap-3">
                    <label className="text-sm text-foreground">
                      Name
                      <input
                        value={formValues.name}
                        onChange={(e) => setFormField('name', e.target.value)}
                        className="mt-1 w-full rounded-2xl border border-border-light bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                      />
                    </label>
                    <label className="text-sm text-foreground">
                      Brand
                      <input
                        value={formValues.brand}
                        onChange={(e) => setFormField('brand', e.target.value)}
                        className="mt-1 w-full rounded-2xl border border-border-light bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                      />
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer mt-1">
                      <input type="checkbox" checked={formValues.isLiquidDeo as boolean} onChange={(e) => {
                        const checked = e.target.checked;
                        setFormField('isLiquidDeo', checked);
                        if (checked && !formValues.category) {
                          setFormField('category', 'Liquid Deodorant');
                        }
                      }} className="w-4 h-4 rounded text-accent focus:ring-accent bg-background border-border" />
                      <span className="text-sm font-semibold text-foreground">This is a Liquid Deodorant</span>
                    </label>
                    <div className="mt-2 mb-2 flex justify-end">
                      <button
                        type="button"
                        onClick={handleAutofill}
                        disabled={isAutofilling || !formValues.name || !formValues.brand}
                        className="text-xs flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
                      >
                        {isAutofilling ? (
                          <>
                            <svg className="animate-spin h-3 w-3 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                            </svg>
                            Fetching...
                          </>
                        ) : (
                          '✨ Auto-fetch Details'
                        )}
                      </button>
                    </div>
                    <label className="text-sm text-foreground">
                      Category
                      <input
                        value={formValues.category}
                        onChange={(e) => setFormField('category', e.target.value)}
                        className="mt-1 w-full rounded-2xl border border-border-light bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                      />
                    </label>
                    <label className="text-sm text-foreground">
                      Concentration
                      <input
                        value={formValues.concentration}
                        onChange={(e) => setFormField('concentration', e.target.value)}
                        className="mt-1 w-full rounded-2xl border border-border-light bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                      />
                    </label>
                  </div>
                </div>
                <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
                  <label className="text-sm text-foreground">
                    Image URL
                    <input
                      value={formValues.image_url}
                      onChange={(e) => setFormField('image_url', e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-border-light bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                  </label>
                  <div className="mt-2">
                    <label className="block text-xs font-medium text-muted mb-1">
                      Or Upload Photo
                    </label>
                    <ImageUploader
                      folder="bottles"
                      value={formValues.image_url}
                      onUploaded={(url, publicId) => {
                        setFormField('image_url', url)
                        setFormField('cloudinary_public_id', publicId)
                      }}
                    />
                  </div>
                  <label className="text-sm text-foreground">
                    Shelf row
                    <input
                      value={formValues.shelf_row}
                      onChange={(e) => setFormField('shelf_row', e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-border-light bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                  </label>
                  <label className="text-sm text-foreground">
                    Occasion
                    <input
                      value={formValues.occasion}
                      onChange={(e) => setFormField('occasion', e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-border-light bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                  </label>
                  <label className="text-sm text-foreground">
                    Notes
                    <textarea
                      value={formValues.notes}
                      onChange={(e) => setFormField('notes', e.target.value)}
                      className="mt-1 h-24 w-full rounded-2xl border border-border-light bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                  </label>
                </div>
                <div className="md:col-span-2 flex flex-wrap gap-3">
                  <button
                    onClick={savePerfume}
                    className="rounded-2xl bg-accent px-5 py-2 text-sm text-background transition hover:bg-surface-hover"
                  >
                    {editId ? 'Update bottle' : 'Add bottle'}
                  </button>
                  <button
                    onClick={resetForm}
                    className="rounded-2xl border border-border-light bg-surface px-5 py-2 text-sm text-foreground transition hover:bg-surface-hover"
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {filterModes.map((mode) => (
            <button
              key={mode}
              onClick={() => {
                setFilterMode(mode)
                setActiveFilter('All')
              }}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors border ${filterMode === mode ? 'bg-accent border-accent text-background shadow-md' : 'bg-surface border-border-light text-muted hover:border-accent/50 hover:text-foreground'}`}
            >
              {mode}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-6">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-muted flex items-center gap-2">
              Auto-sort
            </label>
            <button onClick={() => setAutoSort((s) => !s)} className={`h-8 w-16 rounded-full transition-colors font-medium text-xs ${autoSort ? 'bg-accent text-background' : 'bg-surface border border-border-light text-muted hover:text-foreground'}`}>
              {autoSort ? 'ON' : 'OFF'}
            </button>
          </div>
          <div className="h-6 w-px bg-border hidden sm:block"></div>
          <div className="flex items-center gap-1 bg-surface p-1 rounded-full border border-border-light">
            <button 
              onClick={() => setViewMode('Masonry')} 
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${viewMode === 'Masonry' ? 'bg-accent text-background' : 'text-muted hover:text-foreground'}`}
            >
              Masonry
            </button>
            <button 
              onClick={() => setViewMode('Categorized')} 
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${viewMode === 'Categorized' ? 'bg-accent text-background' : 'text-muted hover:text-foreground'}`}
            >
              Shelves
            </button>
             <button 
              onClick={() => setViewMode('Master Wall')} 
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${viewMode === 'Master Wall' ? 'bg-accent text-background' : 'text-muted hover:text-foreground'}`}
            >
              Wall
            </button>
          </div>
        </div>
      </div>

      <div className="mb-8 flex flex-wrap gap-2 border-b border-border pb-4">
        {activeOptions.map((option) => (
          <button
            key={option}
            onClick={() => setActiveFilter(option)}
            className={`relative rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${activeFilter === option ? 'text-accent font-semibold' : 'text-muted hover:text-foreground'}`}
          >
            {activeFilter === option && (
              <motion.div
                layoutId="activeFilterPill"
                className="absolute inset-0 bg-accent/10 border border-accent/30 rounded-full"
                initial={false}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{option}</span>
          </button>
        ))}
      </div>

      <div className={`transition-all duration-500 origin-top ${selectedPerfume ? 'main-content-scaled' : 'main-content-wrapper'}`}>
      {loading ? (
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-img" style={{ height: `${200 + (i % 3) * 50}px` }}></div>
              <div className="p-4 bg-surface/50">
                <div className="skeleton-text w-3/4"></div>
                <div className="skeleton-text w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-zinc-500">No perfumes match the selected filter.</div>
      ) : viewMode === 'Masonry' ? (
        <MasonryGrid perfumes={filtered} onSelect={setSelectedPerfume} />
      ) : viewMode === 'Master Wall' ? (
        <div className="master-wall-grid animate-fade-in">
          {filtered.map(p => (
            <div key={p.id} className="master-wall-cell group" onClick={() => setSelectedPerfume(p)} data-fragrance-card={true}>
              <div className="master-wall-bottle">
                <BottleImage publicId={p.cloudinary_public_id || p.image_url || '/placeholder-bottle.png'} alt={p.name || p.brand || 'Perfume'} width={200} height={300} className="h-full object-contain" />
              </div>
              <div className="w-full px-2 py-3 mt-1 text-center flex flex-col justify-between flex-1 bg-surface/50 border-t border-border-light/50">
                <div>
                  <div className="font-bold text-xs truncate text-foreground">{p.name || 'Unknown'}</div>
                  <div className="text-muted text-[10px] truncate uppercase tracking-widest mt-0.5">{p.brand || ''}</div>
                </div>
                {user ? (
                  <div className="mt-2 flex flex-wrap justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); startEditing(p) }} className="rounded bg-surface-hover px-2 py-1 text-[10px] text-foreground hover:text-accent border border-border-light">Edit</button>
                    <button onClick={(e) => { e.stopPropagation(); deletePerfume(p.id) }} className="rounded bg-danger/10 px-2 py-1 text-[10px] text-danger hover:bg-danger/20 border border-danger/30">Del</button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {groupEntries.map(([groupLabel, items]) => (
            <div key={groupLabel} className="rounded-2xl border border-border bg-surface/50 p-6 shadow-sm animate-fade-in">
              <div className="mb-4 flex items-center justify-between border-b border-border-light pb-2">
                <div className="text-sm font-semibold tracking-wider text-accent uppercase">
                  {autoSort ? `${filterMode}: ${groupLabel}` : `Shelf ${groupLabel}`} <span className="text-muted ml-2">({items.length})</span>
                </div>
              </div>
              <div className="flex gap-6 overflow-x-auto pb-4 shelf-row physical-shelf pt-6 px-4">
                {items.map((p) => (
                  <div key={p.id} className="w-32 flex-shrink-0 group physical-shelf-item cursor-pointer" onClick={() => setSelectedPerfume(p)} data-fragrance-card={true}>
                    <div className="relative h-44 w-full overflow-hidden rounded-xl bg-surface-hover/80 shadow-lg transition-all duration-300 group-hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-border-light group-hover:border-accent">
                      <BottleImage publicId={p.cloudinary_public_id || p.image_url || '/placeholder-bottle.png'} alt={p.name || p.brand || 'Perfume'} width={200} height={300} className="h-full w-full object-contain p-2" />
                    </div>
                    <div className="mt-3 text-sm">
                      <div className="font-bold truncate text-foreground">{p.name || 'Unknown'}</div>
                      <div className="text-muted truncate">{p.brand || ''}</div>
                      <div className="text-accent-dark text-xs mt-0.5">{p.concentration || ''}</div>
                      {user ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button onClick={(e) => { e.stopPropagation(); startEditing(p) }} className="rounded-full border border-border-light bg-surface px-3 py-1 text-xs text-foreground transition hover:border-accent hover:text-accent">Edit</button>
                          <button onClick={(e) => { e.stopPropagation(); deletePerfume(p.id) }} className="rounded-full border border-danger/30 bg-danger/10 px-3 py-1 text-xs text-danger transition hover:bg-danger/20">Delete</button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

      {/* Detail Drawer */}
      <DetailDrawer perfume={selectedPerfume} onClose={() => setSelectedPerfume(null)} />
    </div>
  )
}
