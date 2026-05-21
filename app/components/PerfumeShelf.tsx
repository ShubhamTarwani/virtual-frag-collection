"use client"

import React, { useEffect, useState } from 'react'
import { createClient, type User } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''
)

type Perfume = {
  id: string
  name?: string
  brand?: string
  category?: string
  concentration?: string
  image_url?: string
  shelf_row?: number
  occasion?: string
  notes?: string
  derivedType?: string
  derivedOccasion?: string
  derivedSmell?: string
  derivedNote?: string
}

const filterModes = ['Type', 'Occasion', 'Smell', 'Notes'] as const
const typeOptions = ['All', 'Niche', 'Designer', 'Middle Eastern', 'Mass Produced', 'Clones', 'Other']
const occasionOptions = ['All', 'Date Night', 'Meeting', 'Casual', 'Evening', 'Office', 'Party']
const smellOptions = ['All', 'Gourmand', 'Fresh', 'Aquatic', 'Floral', 'Woody', 'Oriental', 'Spicy']
const notesOptions = ['All', 'Vanilla', 'Honey', 'Oud', 'Rose', 'Citrus', 'Amber', 'Leather', 'Musk', 'Sandalwood']

const massProducedBrands = new Set([
  'coty',
  'armani',
  'chopard',
  'calvin klein',
  'ck',
  'davidoff',
  'estee lauder',
  'guerlain',
  'lancome',
  'loreal',
  'paco rabanne',
  'paco',
  'versace',
  'dior',
  'guess',
])

const cloneBrands = new Set(['paris corner', 'dupe', 'alt', 'clone', 'xxx collection'])

function classifyPerfume(p: Perfume) {
  const brand = (p.brand || '').toLowerCase()
  const name = (p.name || '').toLowerCase()

  if (cloneBrands.has(brand) || name.includes('clone') || name.includes('dupe') || name.includes('alt')) return 'Clones'
  if (massProducedBrands.has(brand)) return 'Mass Produced'
  const category = (p.category || '').toLowerCase()
  if (category.includes('middle eastern') || category.includes('oriental')) return 'Middle Eastern'
  if (category.includes('niche')) return 'Niche'
  if (category.includes('designer')) return 'Designer'
  if (brand && brand.length > 0 && !massProducedBrands.has(brand)) return 'Niche'
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
  Gourmand: 6,
  Fresh: 7,
  Aquatic: 8,
  Floral: 9,
  Woody: 10,
  Oriental: 11,
  Spicy: 12,
  'Date Night': 13,
  Meeting: 14,
  Casual: 15,
  Evening: 16,
  Office: 17,
  Party: 18,
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
  const [perfumes, setPerfumes] = useState<Perfume[]>([])
  const [loading, setLoading] = useState(true)
  const [filterMode, setFilterMode] = useState<typeof filterModes[number]>('Type')
  const [activeFilter, setActiveFilter] = useState('All')
  const [autoSort, setAutoSort] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [adminOpen, setAdminOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [formValues, setFormValues] = useState({
    name: '',
    brand: '',
    category: '',
    concentration: '',
    image_url: '',
    shelf_row: '0',
    occasion: '',
    notes: '',
  })

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
      const filePath = `bottles/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('perfumes')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw uploadError
      }

      const { data } = supabase.storage
        .from('perfumes')
        .getPublicUrl(filePath)

      if (data?.publicUrl) {
        setFormField('image_url', data.publicUrl)
      }
    } catch (err: any) {
      console.error('Error uploading image:', err)
      alert(`Upload failed: ${err.message || err}`)
    } finally {
      setUploading(false)
    }
  }

  const fetchPerfumes = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('perfumes').select('*').order('shelf_row', { ascending: true })
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
      await fetchPerfumes()
      try {
        const { data, error } = await supabase.auth.getSession()
        if (!error && mounted && data.session?.user) {
          setUser(data.session.user)
        }
      } catch (err) {
        console.error('Supabase auth session error:', err)
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
    setAuthError('')
    setEditId(null)
    setFormValues({
      name: '',
      brand: '',
      category: '',
      concentration: '',
      image_url: '',
      shelf_row: '0',
      occasion: '',
      notes: '',
    })
  }

  const setFormField = (field: keyof typeof formValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }))
  }

  const startEditing = (perfume: Perfume) => {
    setEditId(perfume.id)
    setFormValues({
      name: perfume.name || '',
      brand: perfume.brand || '',
      category: perfume.category || '',
      concentration: perfume.concentration || '',
      image_url: perfume.image_url || '',
      shelf_row: String(perfume.shelf_row ?? 0),
      occasion: perfume.occasion || '',
      notes: perfume.notes || '',
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
      shelf_row: '0',
      occasion: '',
      notes: '',
    })
  }

  const savePerfume = async () => {
    const payload = {
      name: formValues.name,
      brand: formValues.brand,
      category: formValues.category,
      concentration: formValues.concentration,
      image_url: formValues.image_url,
      shelf_row: Number(formValues.shelf_row) || 0,
      occasion: formValues.occasion,
      notes: formValues.notes,
    }

    const action = editId
      ? supabase.from('perfumes').update(payload).eq('id', editId)
      : supabase.from('perfumes').insert([payload])

    const { error } = await action
    if (error) {
      console.error('Supabase save error:', error)
      return
    }

    await fetchPerfumes()
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
    await fetchPerfumes()
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
    if (!autoSort) return Number(b[0]) - Number(a[0])
    return (sortOrder[a[0]] ?? 50) - (sortOrder[b[0]] ?? 50)
  })

  const activeOptions = getFilterOptions(filterMode)

  return (
    <div className="w-full space-y-8">
      <section className="rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Admin access</h2>
            <p className="text-sm text-zinc-500">Anyone can browse the perfume shelf. Press the button to open the login panel and unlock editing.</p>
          </div>
          <button onClick={() => setAdminOpen((open) => !open)} className="rounded-2xl bg-black px-4 py-2 text-sm text-white transition hover:bg-zinc-800">
            {adminOpen ? 'Hide admin panel' : user ? 'Show admin controls' : 'Open login'}
          </button>
        </div>

        {adminOpen || user ? (
          <div className="space-y-4">
            {!user ? (
              <div className="grid gap-4 sm:grid-cols-[1fr_auto] items-end">
                <div className="grid gap-3">
                  <label className="text-sm text-zinc-700">
                    Email
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                    />
                  </label>
                  <label className="text-sm text-zinc-700">
                    Password
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                    />
                  </label>
                </div>
                <div className="flex flex-col items-start gap-3 sm:items-end">
                  <button
                    onClick={handleSignIn}
                    className="rounded-2xl bg-black px-5 py-2 text-sm text-white transition hover:bg-zinc-800"
                  >
                    Sign in
                  </button>
                  {authError ? <div className="text-sm text-red-500">{authError}</div> : null}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-zinc-600">
                    Signed in as <span className="font-semibold text-zinc-900">{user.email}</span>
                  </p>
                  <p className="text-sm text-zinc-500">Editing is protected. Public visitors can still browse the shelf below.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={resetForm}
                    className="rounded-2xl border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-800 transition hover:bg-zinc-100"
                  >
                    New bottle
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="rounded-2xl bg-black px-4 py-2 text-sm text-white transition hover:bg-zinc-800"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}

            {user ? (
              <div className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr]">
                <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4">
                  <div className="grid gap-3">
                    <label className="text-sm text-zinc-700">
                      Name
                      <input
                        value={formValues.name}
                        onChange={(e) => setFormField('name', e.target.value)}
                        className="mt-1 w-full rounded-2xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                      />
                    </label>
                    <label className="text-sm text-zinc-700">
                      Brand
                      <input
                        value={formValues.brand}
                        onChange={(e) => setFormField('brand', e.target.value)}
                        className="mt-1 w-full rounded-2xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                      />
                    </label>
                    <label className="text-sm text-zinc-700">
                      Category
                      <input
                        value={formValues.category}
                        onChange={(e) => setFormField('category', e.target.value)}
                        className="mt-1 w-full rounded-2xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                      />
                    </label>
                    <label className="text-sm text-zinc-700">
                      Concentration
                      <input
                        value={formValues.concentration}
                        onChange={(e) => setFormField('concentration', e.target.value)}
                        className="mt-1 w-full rounded-2xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                      />
                    </label>
                  </div>
                </div>
                <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4">
                  <label className="text-sm text-zinc-700">
                    Image URL
                    <input
                      value={formValues.image_url}
                      onChange={(e) => setFormField('image_url', e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                    />
                  </label>
                  <div className="mt-2">
                    <label className="block text-xs font-medium text-zinc-500 mb-1">
                      Or Upload Photo
                    </label>
                    <div className="relative flex items-center justify-center border border-dashed border-zinc-300 rounded-2xl p-4 bg-zinc-50 hover:bg-zinc-100 transition cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="text-center text-xs text-zinc-600">
                        {uploading ? (
                          <span className="flex items-center gap-2 text-zinc-500">
                            <svg className="animate-spin h-4 w-4 text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                            </svg>
                            Uploading image...
                          </span>
                        ) : formValues.image_url ? (
                          <span className="text-green-600 font-medium">✓ Photo Uploaded successfully</span>
                        ) : (
                          <span>Click to select or drop a photo</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <label className="text-sm text-zinc-700">
                    Shelf row
                    <input
                      value={formValues.shelf_row}
                      onChange={(e) => setFormField('shelf_row', e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                    />
                  </label>
                  <label className="text-sm text-zinc-700">
                    Occasion
                    <input
                      value={formValues.occasion}
                      onChange={(e) => setFormField('occasion', e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                    />
                  </label>
                  <label className="text-sm text-zinc-700">
                    Notes
                    <textarea
                      value={formValues.notes}
                      onChange={(e) => setFormField('notes', e.target.value)}
                      className="mt-1 h-24 w-full rounded-2xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                    />
                  </label>
                </div>
                <div className="md:col-span-2 flex flex-wrap gap-3">
                  <button
                    onClick={savePerfume}
                    className="rounded-2xl bg-black px-5 py-2 text-sm text-white transition hover:bg-zinc-800"
                  >
                    {editId ? 'Update bottle' : 'Add bottle'}
                  </button>
                  <button
                    onClick={resetForm}
                    className="rounded-2xl border border-zinc-300 bg-white px-5 py-2 text-sm text-zinc-800 transition hover:bg-zinc-100"
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
              className={`rounded-full px-3 py-1 text-sm transition-colors ${filterMode === mode ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-800'}`}
            >
              {mode}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <label className="text-sm text-zinc-600">Auto-sort</label>
          <button onClick={() => setAutoSort((s) => !s)} className={`h-8 w-16 rounded-full transition-colors ${autoSort ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-800'}`}>
            {autoSort ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {activeOptions.map((option) => (
          <button
            key={option}
            onClick={() => setActiveFilter(option)}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${activeFilter === option ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-800'}`}
          >
            {option}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <div className="inline-flex items-center gap-3 text-sm text-zinc-500">
            <svg className="h-5 w-5 animate-spin text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <span>Loading perfumes…</span>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-zinc-500">No perfumes match the selected filter.</div>
      ) : (
        <div className="space-y-8">
          {groupEntries.map(([groupLabel, items]) => (
            <div key={groupLabel} className="rounded-lg bg-zinc-50/60 p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-medium text-zinc-600">
                  {autoSort ? `${filterMode}: ${groupLabel}` : `Shelf ${groupLabel}`} ({items.length})
                </div>
              </div>
              <div className="flex gap-4 overflow-auto">
                {items.map((p) => (
                  <div key={p.id} className="w-28 flex-shrink-0">
                    <div className="relative h-36 w-full overflow-hidden rounded-md bg-white/80 shadow-md hover:translate-y-[-4px] transition-transform">
                      <img src={p.image_url || '/placeholder-bottle.png'} alt={p.name || p.brand || 'Perfume'} className="h-full w-full object-contain" />
                    </div>
                    <div className="mt-2 text-xs">
                      <div className="font-semibold truncate">{p.name || 'Unknown'}</div>
                      <div className="text-zinc-500 truncate">{p.brand || ''}</div>
                      <div className="text-zinc-400 text-[11px]">{p.concentration || ''}</div>
                      {user ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button onClick={() => startEditing(p)} className="rounded-full border border-zinc-300 bg-white px-2 py-1 text-[11px] text-zinc-700 transition hover:bg-zinc-100">Edit</button>
                          <button onClick={() => deletePerfume(p.id)} className="rounded-full border border-red-300 bg-red-50 px-2 py-1 text-[11px] text-red-700 transition hover:bg-red-100">Delete</button>
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
  )
}
