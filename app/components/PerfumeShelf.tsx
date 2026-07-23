"use client"
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useMemo, useRef, useState } from 'react'
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
  // Decant / Tester fields
  is_decant?:        boolean
  decant_volume_ml?: number | null
  decant_source?:    string | null
  decant_finished?:  boolean
  custom_categories?: string[]
}

const filterModes = ['Type', 'Custom', 'Occasion', 'Smell', 'Notes'] as const

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
  // Decants short-circuit TYPE classification only.
  // Smell / Notes / Occasion classification runs normally so decants
  // still appear in those filter views.
  if (p.is_decant) return 'Decant'

  const brand = (p.brand || '').toLowerCase()
  const name = (p.name || '').toLowerCase()
  const category = (p.category || '').toLowerCase()

  if (category.includes('liquid deodorant') || category.includes('liquid deodrant') || name.includes('liquid deodorant') || name.includes('liquid deodrant') || category.includes('dry down') || name.includes('dry down')) return 'Liquid Deodorants'

  if (cloneBrands.has(brand) || /\b(clone|dupe|alt)\b/.test(name)) return 'Clones'
  
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

function getDerivedValueForMode(p: Perfume, mode: typeof filterModes[number]) {
  switch (mode) {
    case 'Type':
      return classifyPerfume(p)
    case 'Occasion':
      return classifyOccasion(p)
    case 'Smell':
      return classifySmell(p)
    case 'Notes':
      return classifyNote(p)
  }
}

function buildDynamicOptions(perfumes: Perfume[], mode: typeof filterModes[number], emptyCustomCategories?: Set<string>): string[] {
  if (mode === 'Custom') {
    const customSet = new Set<string>()
    perfumes.forEach(p => {
      if (p.custom_categories && Array.isArray(p.custom_categories)) {
        p.custom_categories.forEach(c => customSet.add(c))
      }
    })
    if (emptyCustomCategories) {
      emptyCustomCategories.forEach(c => customSet.add(c))
    }
    const uniqueCustom = Array.from(customSet).sort(Intl.Collator().compare)
    return uniqueCustom.length > 0 ? ['All', ...uniqueCustom] : ['All']
  }
  const values = perfumes.map(p => getDerivedValueForMode(p, mode)).filter((v): v is string => Boolean(v))
  const unique = [...new Set(values)]
  // Sort by the predefined sortOrder so chips appear in a consistent order
  unique.sort((a, b) => (sortOrder[a as keyof typeof sortOrder] ?? 50) - (sortOrder[b as keyof typeof sortOrder] ?? 50))
  return unique.length > 0 ? ['All', ...unique] : ['All']
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
  if (mode === 'Custom') {
    return !!p.custom_categories?.includes(value)
  }
  const derivedValue = getDerivedValue(p, mode)
  return derivedValue === value || (mode === 'Notes' && (p.notes || '').toLowerCase().includes(value.toLowerCase()))
}

const sortOrder: Record<string, number> = {
  Niche: 1,
  Designer: 2,
  'Middle Eastern': 3,
  'Mass Produced': 4,
  Clones: 5,
  Decant: 5.5,
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

/* ─────────────────────────────────────────────────────────────────
   ShelfSection — collapsible/expandable shelf group with
   ResizeObserver-driven column detection and max-height animation.
   Each section owns its own isExpanded state independently.
───────────────────────────────────────────────────────────────── */
type ShelfSectionProps = {
  groupLabel: string
  items: Perfume[]
  filterMode: typeof filterModes[number]
  autoSort: boolean
  user: User | null
  setSelectedPerfume: (p: Perfume | null) => void
  startEditing: (p: Perfume) => void
  deletePerfume: (id: string) => Promise<void>
}

function ShelfSection({ groupLabel, items, filterMode, autoSort, user, setSelectedPerfume, startEditing, deletePerfume }: ShelfSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [cols, setCols] = useState(5)
  const gridRef  = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLDivElement>(null)

  // Detect rendered column count via ResizeObserver
  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    const observer = new ResizeObserver(() => {
      const w = el.offsetWidth
      if (w < 600)       setCols(2)
      else if (w < 900)  setCols(3)
      else if (w < 1200) setCols(4)
      else               setCols(5)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const handleToggle = () => {
    if (isExpanded) {
      // After collapsing, scroll section header back into view
      setTimeout(() => {
        sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 460) // matches 0.45s CSS transition
    }
    setIsExpanded(prev => !prev)
  }

  const sectionTitle = autoSort
    ? groupLabel === 'Decant' ? 'Decants / Testers' : `${filterMode}: ${groupLabel}`
    : `Shelf ${groupLabel}`

  // Collapsed height ≈ one card row (aspect-ratio 3/4 card + name text + edit buttons + gap)
  const COLLAPSED_HEIGHT = 520
  const isSingleRow = items.length <= cols;
  const hasOverflow = items.length > cols;

  return (
    <div ref={sectionRef} className="w-full overflow-visible rounded-2xl border border-border bg-surface/50 p-6 shadow-sm animate-fade-in">
      {/* Section header */}
      <div className="mb-6 flex items-center justify-between border-b border-white/[0.08] pb-2">
        <div className="text-sm font-semibold tracking-wider text-accent uppercase">
          {sectionTitle} <span className="text-muted ml-2">({items.length})</span>
        </div>
      </div>

      <div
        ref={gridRef}
        className="shelf-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: '16px',
          overflow: isSingleRow ? 'visible' : 'hidden',
          maxHeight: isSingleRow || isExpanded 
            ? '9999px' 
            : `${COLLAPSED_HEIGHT}px`,
          transition: isSingleRow 
            ? 'none' 
            : 'max-height 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {items.filter(p => p != null && p.id != null).map((p) => (
          <div
            key={p.id}
            className={`w-full group touch-card cursor-pointer${p.decant_finished ? ' card-decant-finished' : ''}`}
            onClick={() => setSelectedPerfume(p)}
            data-fragrance-card={true}
          >
            <div
              className="relative w-full overflow-hidden rounded-xl bg-surface-hover/80 shadow-lg transition-all duration-300 group-hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-border-light group-hover:border-accent"
              style={{ aspectRatio: '3/4' }}
            >
              <BottleImage
                publicId={p.cloudinary_public_id || p.image_url || '/placeholder-bottle.png'}
                alt={p.name || p.brand || 'Perfume'}
                width={200}
                height={300}
                className="absolute inset-0 h-full w-full object-contain p-2"
              />
              {p.is_decant && (
                <div className={`decant-badge${p.decant_finished ? ' finished' : ''}`}>
                  🧪 {p.decant_volume_ml != null ? `${p.decant_volume_ml}ml` : 'Decant'}
                  {p.decant_finished && ' · Empty'}
                </div>
              )}
            </div>
            <div className="mt-3 text-sm">
              <div className="card-name-clamp font-bold text-foreground">{p.name || 'Unknown'}</div>
              <div className="text-muted truncate">{p.brand || ''}</div>
              <div className="text-accent-dark text-xs mt-0.5">{p.concentration || ''}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); startEditing?.(p) }}
                  className="rounded-full border border-border-light bg-surface px-3 py-1 text-xs text-foreground transition hover:border-accent hover:text-accent"
                >Edit</button>
                <button
                  onClick={(e) => { e.stopPropagation(); deletePerfume?.(p.id) }}
                  className="rounded-full border border-danger/30 bg-danger/10 px-3 py-1 text-xs text-danger transition hover:bg-danger/20"
                >Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Gradient fade — hints at hidden rows when collapsed */}
      {hasOverflow && !isExpanded && (
        <div
          aria-hidden="true"
          style={{
            position: 'relative',
            marginTop: '-64px',
            height: '64px',
            background: 'linear-gradient(to bottom, transparent, hsl(222 20% 8%))',
            pointerEvents: 'none',
            zIndex: 1,
            opacity: 1,
            transition: 'opacity 0.3s ease',
          }}
        />
      )}

      {/* Expand / collapse toggle — only when items overflow one row */}
      {!isSingleRow && hasOverflow && (
        <button
          onClick={handleToggle}
          className="shelf-expand-btn"
          aria-label={isExpanded ? 'Collapse' : `Show all ${items.length}`}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
            style={{
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <path
              d="M5 7.5L10 12.5L15 7.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{isExpanded ? 'Collapse' : `Show all ${items.length}`}</span>
        </button>
      )}
    </div>
  )
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
  const [toggledDeo, setToggledDeo] = useState(false)

  const [selectedPerfume, setSelectedPerfume] = useState<Perfume | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const editFormRef = useRef<HTMLDivElement>(null)
  const [formValues, setFormValues] = useState({
    name: '', brand: '', category: '', concentration: '', image_url: '', cloudinary_public_id: '',
    shelf_row: '0', occasion: '', notes: '', rating: '', longevity_hours: '', ideal_season: '',
    isLiquidDeo: false,
    // Decant fields
    is_decant: false,
    decant_volume_ml: null as number | null,
    decant_source: '',
    decant_finished: false,
    custom_categories: '',
  })

  const [showBulkManager, setShowBulkManager] = useState(false)
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(new Set())
  const [initialBulkSelectedIds, setInitialBulkSelectedIds] = useState<Set<string>>(new Set())
  const [bulkTypeFilter, setBulkTypeFilter] = useState('All')

  const [emptyCustomCategories, setEmptyCustomCategories] = useState<Set<string>>(new Set())
  const [showCreateShelfManager, setShowCreateShelfManager] = useState(false)
  const [newShelfName, setNewShelfName] = useState('')
  const [newShelfTypes, setNewShelfTypes] = useState<Set<string>>(new Set())

  // Clean up empty custom categories if they are now in the DB
  useEffect(() => {
    let changed = false
    const newEmpty = new Set(emptyCustomCategories)
    const existing = new Set<string>()
    perfumes.forEach(p => {
      if (p.custom_categories) {
        p.custom_categories.forEach(c => existing.add(c.toLowerCase()))
      }
    })
    for (const ec of newEmpty) {
      if (existing.has(ec.toLowerCase())) {
        newEmpty.delete(ec)
        changed = true
      }
    }
    if (changed) {
      setEmptyCustomCategories(newEmpty)
    }
  }, [perfumes, emptyCustomCategories])

  const handleCreateShelf = async () => {
    if (!newShelfName.trim() || !user) return

    const trimmedName = newShelfName.trim()
    const lowerName = trimmedName.toLowerCase()

    // Check if it already exists in real categories
    const existing = new Set<string>()
    let actualNameToUse = trimmedName
    perfumes.forEach(p => {
      if (p.custom_categories) {
        p.custom_categories.forEach(c => {
          if (c.toLowerCase() === lowerName) {
            actualNameToUse = c // use existing case
          }
          existing.add(c.toLowerCase())
        })
      }
    })

    // Also check empty categories for merging
    for (const ec of emptyCustomCategories) {
      if (ec.toLowerCase() === lowerName) {
        actualNameToUse = ec
        existing.add(ec.toLowerCase())
      }
    }

    const updates: any[] = []
    
    // Find all matching perfumes based on type
    let matchedCount = 0
    if (newShelfTypes.size > 0) {
      perfumes.forEach(p => {
        const pType = classifyPerfume(p)
        if (newShelfTypes.has(pType)) {
          matchedCount++
          let cats = p.custom_categories || []
          if (!cats.some(c => c.toLowerCase() === lowerName)) {
            cats = [...cats, actualNameToUse]
            updates.push(supabase.from('perfumes').update({ custom_categories: cats }).eq('id', p.id))
          }
        }
      })
    }
    
    console.log(`[handleCreateShelf] Total perfumes matched by type: ${matchedCount}`)
    console.log(`[handleCreateShelf] Total perfumes needing update: ${updates.length}`)

    try {
      if (updates.length > 0) {
        const results = await Promise.all(updates)
        const errors = results.filter(r => r.error).map(r => r.error)
        
        if (errors.length > 0) {
          console.error('[handleCreateShelf] Batch update errors:', errors)
          alert('Failed to update some perfumes: ' + errors[0]?.message)
          // Don't return early here if some succeeded, we still want to fetch
        } else {
          console.log('[handleCreateShelf] Batch update successful.')
        }
        
        console.log('[handleCreateShelf] Fetching fresh perfumes from DB...')
        await fetchPerfumes(user.id)
        console.log('[handleCreateShelf] Fetch complete.')
      } else if (!existing.has(lowerName)) {
        // Create empty shelf if no matches and it didn't exist
        const newEmpty = new Set(emptyCustomCategories)
        newEmpty.add(actualNameToUse)
        setEmptyCustomCategories(newEmpty)
      }
    } catch (err) {
      console.error('[handleCreateShelf] Unexpected error:', err)
      alert('An unexpected error occurred during batch update.')
    }

    setFilterMode('Custom')
    setActiveFilter(actualNameToUse)
    setShowCreateShelfManager(false)
    setNewShelfName('')
    setNewShelfTypes(new Set())
  }

  const openBulkManager = () => {
    const initialSelected = new Set<string>()
    perfumes.forEach(p => {
      const cats = p.custom_categories || []
      if (cats.map(c => c.toLowerCase()).includes(activeFilter.toLowerCase())) {
        initialSelected.add(p.id)
      }
    })
    setInitialBulkSelectedIds(initialSelected)
    setBulkSelectedIds(new Set(initialSelected))
    setBulkTypeFilter('All')
    setShowBulkManager(true)
  }

  const saveBulkChanges = async () => {
    if (!user) return
    const updates: Promise<any>[] = []
    
    perfumes.forEach(p => {
      const initiallySelected = initialBulkSelectedIds.has(p.id)
      const nowSelected = bulkSelectedIds.has(p.id)
      
      if (initiallySelected !== nowSelected) {
        let cats = p.custom_categories || []
        if (nowSelected) {
          cats = [...cats, activeFilter]
        } else {
          cats = cats.filter(c => c.toLowerCase() !== activeFilter.toLowerCase())
        }
        
        // dedupe
        const rawCats = cats.map(s => s.trim()).filter(Boolean)
        const seen = new Set<string>()
        const deduped: string[] = []
        for (const c of rawCats) {
          const lower = c.toLowerCase()
          if (!seen.has(lower)) {
            seen.add(lower)
            deduped.push(c)
          }
        }
        const custom_categories = deduped.length > 0 ? deduped : null
        
        updates.push(
          supabase.from('perfumes').update({ custom_categories }).eq('id', p.id)
        )
      }
    })
    
    if (updates.length > 0) {
      await Promise.all(updates)
      await fetchPerfumes(user.id)
    }
    setShowBulkManager(false)
  }

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
        body: JSON.stringify({ 
          name: formValues.name, 
          brand: formValues.brand, 
          isLiquidDeo: formValues.isLiquidDeo,
          forceRefresh: toggledDeo
        })
      })
      
      setToggledDeo(false)

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
        ideal_season: data.ideal_season || prev.ideal_season,
        // Guard: autofill must NEVER overwrite user-entered decant fields
        is_decant:        prev.is_decant,
        decant_volume_ml: prev.decant_volume_ml,
        decant_source:    prev.decant_source,
        decant_finished:  prev.decant_finished,
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
      is_decant: false,
      decant_volume_ml: null,
      decant_source: '',
      decant_finished: false,
      custom_categories: '',
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
      is_decant: perfume.is_decant || false,
      decant_volume_ml: perfume.decant_volume_ml ?? null,
      decant_source: perfume.decant_source || '',
      decant_finished: perfume.decant_finished || false,
      custom_categories: perfume.custom_categories?.join(', ') || '',
    })
    setTimeout(() => {
      editFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
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
      is_decant: false,
      decant_volume_ml: null,
      decant_source: '',
      decant_finished: false,
      custom_categories: '',
    })
  }

  const savePerfume = async () => {
    let custom_categories: string[] | null = null;
    if (formValues.custom_categories) {
      const rawCats = formValues.custom_categories.split(',').map(s => s.trim()).filter(Boolean);
      const seen = new Set<string>();
      const deduped: string[] = [];
      for (const c of rawCats) {
        const lower = c.toLowerCase();
        if (!seen.has(lower)) {
          seen.add(lower);
          deduped.push(c);
        }
      }
      if (deduped.length > 0) {
        custom_categories = deduped;
      }
    }

    const payload: Record<string, unknown> = {
      name: formValues.name,
      brand: formValues.brand,
      category: formValues.category,
      custom_categories,
      concentration: formValues.concentration,
      image_url: formValues.image_url,
      cloudinary_public_id: formValues.cloudinary_public_id,
      shelf_row: Number(formValues.shelf_row) || 0,
      occasion: formValues.occasion,
      notes: formValues.notes,
      // Decant fields — always send explicit values (null not omitted)
      // so toggling off clears stale DB values
      is_decant:        formValues.is_decant,
      decant_volume_ml: formValues.is_decant ? (formValues.decant_volume_ml ?? null) : null,
      decant_source:    formValues.is_decant ? (formValues.decant_source || null)      : null,
      decant_finished:  formValues.is_decant ? (formValues.decant_finished || false)   : false,
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
  }).map(([label, items]) => {
    // Within the Decant section: unfinished first, finished last
    if (label === 'Decant') {
      const sorted = [...items].sort((a, b) => {
        const aF = a.decant_finished ? 1 : 0
        const bF = b.decant_finished ? 1 : 0
        return aF - bF
      })
      return [label, sorted] as [string, Perfume[]]
    }
    return [label, items] as [string, Perfume[]]
  })

  const activeOptions = useMemo(() => buildDynamicOptions(perfumes, filterMode, emptyCustomCategories), [perfumes, filterMode, emptyCustomCategories])

  // Reset active filter if it no longer exists in the dynamic options
  useEffect(() => {
    if (activeFilter !== 'All' && !activeOptions.includes(activeFilter)) {
      setActiveFilter('All')
    }
  }, [activeOptions, activeFilter])

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
              <div ref={editFormRef} className="form-section mt-6 grid gap-4 md:grid-cols-[1fr_1fr]">
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
                        setToggledDeo(true);
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
                    <label className="text-sm text-foreground">
                      Custom Categories (comma separated)
                      <input
                        value={formValues.custom_categories}
                        onChange={(e) => setFormField('custom_categories', e.target.value)}
                        placeholder="e.g. Summer Bests, Gym Scents"
                        className="mt-1 w-full rounded-2xl border border-border-light bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                      />
                    </label>

                    {/* ── Decant / Tester toggle ──────────────── */}
                    <label className="flex items-center gap-3 cursor-pointer mt-1 select-none">
                      <span className="text-sm text-foreground font-medium">🧪 Decant / Tester?</span>
                      <input
                        type="checkbox"
                        checked={formValues.is_decant}
                        onChange={(e) => {
                          const checked = e.target.checked
                          setFormValues(prev => ({
                            ...prev,
                            is_decant: checked,
                            // Reset decant sub-fields when toggled OFF
                            decant_volume_ml: checked ? prev.decant_volume_ml : null,
                            decant_source:    checked ? prev.decant_source    : '',
                            decant_finished:  false,
                          }))
                        }}
                        className="w-4 h-4 rounded text-accent focus:ring-accent bg-background border-border"
                      />
                    </label>

                    {/* ── Decant sub-fields (visible only when toggled ON) ── */}
                    {formValues.is_decant && (
                      <div className="mt-1 space-y-3 rounded-2xl border border-[rgba(255,200,100,0.2)] bg-[rgba(255,200,100,0.04)] p-4">
                        {/* Volume — quick-pick chips + manual input (single source of truth) */}
                        <div>
                          <div className="text-xs font-medium text-muted mb-1">Volume (ml)</div>
                          <div className="volume-chips">
                            {[1, 2, 5, 10, 15, 30].map(v => (
                              <button
                                key={v}
                                type="button"
                                className={`volume-chip${formValues.decant_volume_ml === v ? ' active' : ''}`}
                                onClick={() => setFormValues(prev => ({ ...prev, decant_volume_ml: v }))}
                              >
                                {v}ml
                              </button>
                            ))}
                          </div>
                          <input
                            type="number"
                            min="0.5"
                            max="100"
                            step="0.5"
                            placeholder="Custom ml (e.g. 7.5)"
                            value={formValues.decant_volume_ml ?? ''}
                            onChange={(e) => setFormValues(prev => ({
                              ...prev,
                              decant_volume_ml: e.target.value ? parseFloat(e.target.value) : null
                            }))}
                            className="mt-2 w-full rounded-2xl border border-border-light bg-surface px-3 py-2 text-sm outline-none focus:border-[#ffc864]"
                          />
                        </div>

                        {/* Source — optional */}
                        <div>
                          <label className="text-xs font-medium text-muted">Source (optional)</label>
                          <input
                            type="text"
                            placeholder="e.g. Surrender to Chance, r/fragrance swap, friend..."
                            value={formValues.decant_source}
                            onChange={(e) => setFormValues(prev => ({ ...prev, decant_source: e.target.value }))}
                            className="mt-1 w-full rounded-2xl border border-border-light bg-surface px-3 py-2 text-sm outline-none focus:border-[#ffc864]"
                          />
                        </div>

                        {/* Finished toggle */}
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                          <span className="text-sm text-foreground">Empty / Finished?</span>
                          <input
                            type="checkbox"
                            checked={formValues.decant_finished}
                            onChange={(e) => setFormValues(prev => ({ ...prev, decant_finished: e.target.checked }))}
                            className="w-4 h-4 rounded text-accent focus:ring-accent bg-background border-border"
                          />
                        </label>
                      </div>
                    )}
                  </div>{/* /grid gap-3 */}
                </div>{/* /left column space-y-3 */}
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
                <div className="md:col-span-2 flex flex-col sm:flex-row flex-wrap gap-3">
                  <button
                    onClick={savePerfume}
                    className="save-btn rounded-2xl bg-accent px-5 py-3 text-base sm:text-sm text-background transition hover:bg-surface-hover flex items-center"
                  >
                    {editId ? 'Update bottle' : 'Add bottle'}
                  </button>
                  <button
                    onClick={resetForm}
                    className="rounded-2xl border border-border-light bg-surface px-5 py-3 sm:py-2 text-base sm:text-sm text-foreground transition hover:bg-surface-hover"
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <div className="mb-3 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
        <div className="filter-tabs">
          {filterModes.map((mode) => (
            <button
              key={mode}
              onClick={() => {
                setFilterMode(mode)
                setActiveFilter('All')
              }}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors border shrink-0 min-h-[44px] ${filterMode === mode ? 'bg-accent border-accent text-background shadow-md' : 'bg-surface border-border-light text-muted hover:border-accent/50 hover:text-foreground'}`}
            >
              {mode}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 sm:gap-6 sm:ml-auto flex-wrap">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-muted flex items-center gap-2">
              Auto-sort
            </label>
            <button onClick={() => setAutoSort((s) => !s)} className={`h-11 w-16 rounded-full transition-colors font-medium text-xs ${autoSort ? 'bg-accent text-background' : 'bg-surface border border-border-light text-muted hover:text-foreground'}`}>
              {autoSort ? 'ON' : 'OFF'}
            </button>
          </div>
          <div className="h-6 w-px bg-border hidden sm:block"></div>
          <div className="flex items-center gap-1 bg-surface p-1 rounded-full border border-border-light">
            <button 
              onClick={() => setViewMode('Masonry')} 
              className={`px-3 py-2 text-xs font-medium rounded-full transition-colors min-h-[36px] ${viewMode === 'Masonry' ? 'bg-accent text-background' : 'text-muted hover:text-foreground'}`}
            >
              Masonry
            </button>
            <button 
              onClick={() => setViewMode('Categorized')} 
              className={`px-3 py-2 text-xs font-medium rounded-full transition-colors min-h-[36px] ${viewMode === 'Categorized' ? 'bg-accent text-background' : 'text-muted hover:text-foreground'}`}
            >
              Shelves
            </button>
             <button 
              onClick={() => setViewMode('Master Wall')} 
              className={`px-3 py-2 text-xs font-medium rounded-full transition-colors min-h-[36px] ${viewMode === 'Master Wall' ? 'bg-accent text-background' : 'text-muted hover:text-foreground'}`}
            >
              Wall
            </button>
          </div>
        </div>
      </div>

      {(activeOptions.length > 1 || filterMode === 'Custom') && (
        <div className="filter-tabs mb-8 border-b border-border pb-4 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 overflow-x-auto flex-1">
            {activeOptions.map((option) => (
              <button
                key={option}
                onClick={() => setActiveFilter(option)}
                className={`relative rounded-full px-4 py-2.5 text-xs font-medium transition-colors shrink-0 min-h-[44px] ${activeFilter === option ? 'text-accent font-semibold' : 'text-muted hover:text-foreground'}`}
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
            {filterMode === 'Custom' && user && (
              <button
                onClick={() => setShowCreateShelfManager(true)}
                className="relative rounded-full px-4 py-2.5 text-xs font-medium transition-colors shrink-0 min-h-[44px] border border-dashed border-border-light text-muted hover:border-accent hover:text-foreground flex items-center gap-1"
              >
                + Create Custom Shelf
              </button>
            )}
          </div>
          {filterMode === 'Custom' && activeFilter !== 'All' && user && (
            <button
              onClick={openBulkManager}
              className="ml-auto rounded-full bg-accent/10 border border-accent/30 px-4 py-2 text-xs font-medium text-accent hover:bg-accent/20 transition-colors shrink-0 whitespace-nowrap min-h-[44px]"
            >
              ✨ Manage perfumes
            </button>
          )}
        </div>
      )}

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
        <div className="space-y-12">
          {groupEntries.map(([groupLabel, items]) => (
            <div key={groupLabel} className="animate-fade-in">
              <div className="mb-6 flex items-center justify-between border-b border-border-light pb-2">
                <h3 className="text-lg font-serif font-semibold tracking-wider text-accent uppercase">
                  {autoSort ? `${filterMode}: ${groupLabel}` : `Shelf ${groupLabel}`} <span className="text-muted ml-2 text-sm normal-case font-sans">({items.length} bottles)</span>
                </h3>
              </div>
              <MasonryGrid 
                perfumes={items} 
                onSelect={setSelectedPerfume}
                user={user}
                onEdit={startEditing}
                onDelete={deletePerfume}
              />
            </div>
          ))}
        </div>
      ) : viewMode === 'Master Wall' ? (
        <div className="master-wall-grid animate-fade-in">
          {filtered.map(p => (
            <div key={p.id} className="group relative" style={{
              background: '#111',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              cursor: 'pointer',
            }} onClick={() => setSelectedPerfume(p)} data-fragrance-card={true}>
              {/* Bottle — fills most of the row height */}
              <div style={{
                height: '165px',
                width: '100%',
                padding: '8px 12px 0',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                overflow: 'hidden',
              }}>
                <BottleImage
                  publicId={p.cloudinary_public_id || p.image_url || ''}
                  alt={p.name || 'Perfume'}
                  width={300}
                  height={300}
                  className="max-h-full w-auto object-contain object-bottom"
                />
              </div>

              {/* Edit/Delete overlay (keep this!) */}
              {startEditing && deletePerfume && (
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-center gap-2 pb-3 bg-gradient-to-t from-black/60 to-transparent z-10">
                  <button onClick={(e) => { e.stopPropagation(); startEditing(p); }} className="text-xs px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white shadow-sm transition-colors border border-white/20">Edit</button>
                  <button onClick={(e) => { e.stopPropagation(); deletePerfume(p.id); }} className="text-xs px-3 py-1 rounded-full bg-red-500/30 hover:bg-red-500/50 text-red-100 shadow-sm transition-colors border border-red-500/30">Delete</button>
                </div>
              )}

              {/* Slim name bar */}
              <div style={{
                width: '100%',
                padding: '4px 10px 6px',
                background: 'rgba(0,0,0,0.4)',
                marginTop: 'auto'
              }}>
                <div style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: '#fff',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {p.name}
                </div>
                <div style={{
                  fontSize: '0.62rem',
                  color: 'rgba(255,255,255,0.4)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {p.brand}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          {groupEntries.map(([groupLabel, items]) => (
            <ShelfSection
              key={groupLabel}
              groupLabel={groupLabel}
              items={items as Perfume[]}
              filterMode={filterMode}
              autoSort={autoSort}
              user={user}
              setSelectedPerfume={setSelectedPerfume}
              startEditing={startEditing}
              deletePerfume={deletePerfume}
            />
          ))}
        </div>
      )}
      </div>

      {/* Detail Drawer */}
      <DetailDrawer perfume={selectedPerfume} onClose={() => setSelectedPerfume(null)} />

      {/* Bulk Manager Modal */}
      {showBulkManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-surface border border-border shadow-2xl rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Manage: {activeFilter}</h2>
                <p className="text-sm text-muted">Select perfumes to add to this custom category.</p>
              </div>
              <button onClick={() => setShowBulkManager(false)} className="text-muted hover:text-foreground">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-4 border-b border-border bg-surface-hover/50">
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                <span className="text-sm font-medium text-muted whitespace-nowrap">Filter by Type:</span>
                {['All', 'Niche', 'Designer', 'Middle Eastern', 'Mass Produced', 'Clones', 'Liquid Deodorants', 'Other'].map(type => (
                  <button
                    key={type}
                    onClick={() => setBulkTypeFilter(type)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors border ${bulkTypeFilter === type ? 'bg-accent border-accent text-background' : 'bg-surface border-border-light text-muted hover:border-accent hover:text-foreground'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {perfumes
                .filter(p => bulkTypeFilter === 'All' || classifyPerfume(p) === bulkTypeFilter)
                .map(p => {
                  const isSelected = bulkSelectedIds.has(p.id)
                  return (
                    <label key={p.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${isSelected ? 'border-accent bg-accent/5' : 'border-border-light bg-surface hover:border-accent/50'}`}>
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={(e) => {
                          const newSet = new Set(bulkSelectedIds)
                          if (e.target.checked) newSet.add(p.id)
                          else newSet.delete(p.id)
                          setBulkSelectedIds(newSet)
                        }}
                        className="w-5 h-5 rounded text-accent focus:ring-accent bg-background border-border"
                      />
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 shrink-0 bg-surface-hover rounded flex items-center justify-center p-1">
                          <BottleImage publicId={p.cloudinary_public_id || p.image_url || ''} alt={p.name || ''} width={40} height={40} className="object-contain max-h-full" />
                        </div>
                        <div className="overflow-hidden">
                          <div className="text-sm font-semibold text-foreground truncate">{p.name || 'Unknown'}</div>
                          <div className="text-xs text-muted truncate">{p.brand || 'Unknown'}</div>
                        </div>
                      </div>
                    </label>
                  )
              })}
            </div>

            <div className="p-4 sm:p-6 border-t border-border flex items-center justify-end gap-3 bg-surface-hover/30">
              <button onClick={() => setShowBulkManager(false)} className="px-5 py-2.5 text-sm font-medium rounded-xl border border-border-light hover:bg-surface-hover transition-colors">Cancel</button>
              <button onClick={saveBulkChanges} className="px-5 py-2.5 text-sm font-medium rounded-xl bg-accent text-background hover:bg-surface-hover transition-colors">Save changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Custom Shelf Modal */}
      {showCreateShelfManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md flex flex-col bg-surface border border-border shadow-2xl rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Create Custom Shelf</h2>
              <button onClick={() => setShowCreateShelfManager(false)} className="text-muted hover:text-foreground">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Shelf Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Signature Niche"
                  value={newShelfName}
                  onChange={e => setNewShelfName(e.target.value)}
                  className="w-full rounded-xl border border-border-light bg-surface px-4 py-2 text-sm outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Auto-populate by Type (Optional)</label>
                <div className="flex flex-wrap gap-2">
                  {['Niche', 'Designer', 'Middle Eastern', 'Mass Produced', 'Clones', 'Liquid Deodorants', 'Other'].map(type => (
                    <button
                      key={type}
                      onClick={() => {
                        const newSet = new Set(newShelfTypes)
                        if (newSet.has(type)) newSet.delete(type)
                        else newSet.add(type)
                        setNewShelfTypes(newSet)
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors border ${newShelfTypes.has(type) ? 'bg-accent border-accent text-background' : 'bg-surface border-border-light text-muted hover:border-accent hover:text-foreground'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 border-t border-border flex items-center justify-end gap-3 bg-surface-hover/30">
              <button onClick={() => setShowCreateShelfManager(false)} className="px-5 py-2.5 text-sm font-medium rounded-xl border border-border-light hover:bg-surface-hover transition-colors">Cancel</button>
              <button onClick={handleCreateShelf} className="px-5 py-2.5 text-sm font-medium rounded-xl bg-accent text-background hover:bg-surface-hover transition-colors">Save shelf</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
