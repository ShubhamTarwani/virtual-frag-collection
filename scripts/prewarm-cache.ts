import { loadEnvConfig } from '@next/env'
const projectDir = process.cwd()
loadEnvConfig(projectDir)

const POPULAR_FRAGRANCES = [
  // Top searches
  { brand: 'Dior', name: 'Sauvage', concentration: 'EDT' },
  { brand: 'Dior', name: 'Sauvage', concentration: 'EDP' },
  { brand: 'Creed', name: 'Aventus', concentration: 'EDP' },
  { brand: 'Chanel', name: 'Bleu de Chanel', concentration: 'EDT' },
  { brand: 'Chanel', name: 'Bleu de Chanel', concentration: 'EDP' },
  { brand: 'Chanel', name: 'Bleu de Chanel', concentration: 'Parfum' },
  { brand: 'Louis Vuitton', name: 'Ombre Nomade', concentration: 'EDP' },
  { brand: 'Maison Francis Kurkdjian', name: 'Baccarat Rouge 540', concentration: 'EDP' },
  { brand: 'Maison Francis Kurkdjian', name: 'Baccarat Rouge 540 Extrait de Parfum', concentration: 'Extrait' },
  { brand: 'Lancome', name: 'La Vie Est Belle', concentration: 'EDP' },
  { brand: 'Yves Saint Laurent', name: 'Black Opium', concentration: 'EDP' },
  { brand: 'Giorgio Armani', name: 'Acqua di Gio Profumo', concentration: 'Parfum' },
  { brand: 'Yves Saint Laurent', name: 'Y', concentration: 'EDP' },
  { brand: 'Yves Saint Laurent', name: 'Y', concentration: 'EDT' },
  // Highly popular niches
  { brand: 'Parfums de Marly', name: 'Layton', concentration: 'EDP' },
  { brand: 'Parfums de Marly', name: 'Herod', concentration: 'EDP' },
  { brand: 'Parfums de Marly', name: 'Pegasus', concentration: 'EDP' },
  { brand: 'Parfums de Marly', name: 'Carlisle', concentration: 'EDP' },
  { brand: 'Parfums de Marly', name: 'Oajan', concentration: 'EDP' },
  { brand: 'Parfums de Marly', name: 'Greenley', concentration: 'EDP' },
  { brand: 'Parfums de Marly', name: 'Sedley', concentration: 'EDP' },
  { brand: 'Creed', name: 'Silver Mountain Water', concentration: 'EDP' },
  { brand: 'Creed', name: 'Green Irish Tweed', concentration: 'EDP' },
  { brand: 'Creed', name: 'Millesime Imperial', concentration: 'EDP' },
  { brand: 'Creed', name: 'Virgin Island Water', concentration: 'EDP' },
  { brand: 'Tom Ford', name: 'Tobacco Vanille', concentration: 'EDP' },
  { brand: 'Tom Ford', name: 'Oud Wood', concentration: 'EDP' },
  { brand: 'Tom Ford', name: 'Tuscan Leather', concentration: 'EDP' },
  { brand: 'Tom Ford', name: 'Black Orchid', concentration: 'EDP' },
  { brand: 'Tom Ford', name: 'Ombre Leather', concentration: 'EDP' },
  { brand: 'Tom Ford', name: 'Noir Extreme', concentration: 'EDP' },
  { brand: 'Kilian', name: 'Angels\' Share', concentration: 'EDP' },
  { brand: 'Kilian', name: 'Black Phantom', concentration: 'EDP' },
  { brand: 'Kilian', name: 'Intoxicated', concentration: 'EDP' },
  { brand: 'Kilian', name: 'Straight to Heaven', concentration: 'EDP' },
  { brand: 'Xerjoff', name: 'Naxos', concentration: 'EDP' },
  { brand: 'Xerjoff', name: 'Erba Pura', concentration: 'EDP' },
  { brand: 'Xerjoff', name: 'Alexandria II', concentration: 'Parfum' },
  { brand: 'Nishane', name: 'Hacivat', concentration: 'Extrait' },
  { brand: 'Nishane', name: 'Ani', concentration: 'Extrait' },
  { brand: 'Amouage', name: 'Reflection Man', concentration: 'EDP' },
  { brand: 'Amouage', name: 'Interlude Man', concentration: 'EDP' },
  { brand: 'Amouage', name: 'Jubilation XXV Man', concentration: 'EDP' },
  // Highly popular designers
  { brand: 'Versace', name: 'Eros', concentration: 'EDT' },
  { brand: 'Versace', name: 'Eros', concentration: 'EDP' },
  { brand: 'Versace', name: 'Eros Flame', concentration: 'EDP' },
  { brand: 'Versace', name: 'Pour Homme', concentration: 'EDT' },
  { brand: 'Versace', name: 'Dylan Blue', concentration: 'EDT' },
  { brand: 'Prada', name: 'L\'Homme', concentration: 'EDT' },
  { brand: 'Prada', name: 'L\'Homme Intense', concentration: 'EDP' },
  { brand: 'Prada', name: 'Luna Rossa Carbon', concentration: 'EDT' },
  { brand: 'Prada', name: 'Luna Rossa Black', concentration: 'EDP' },
  { brand: 'Giorgio Armani', name: 'Acqua di Gio', concentration: 'EDT' },
  { brand: 'Giorgio Armani', name: 'Acqua di Gio Profondo', concentration: 'EDP' },
  { brand: 'Giorgio Armani', name: 'Stronger With You', concentration: 'EDT' },
  { brand: 'Giorgio Armani', name: 'Stronger With You Intensely', concentration: 'EDP' },
  { brand: 'Giorgio Armani', name: 'Stronger With You Absolutely', concentration: 'Parfum' },
  { brand: 'Giorgio Armani', name: 'Code Profumo', concentration: 'Parfum' },
  { brand: 'Giorgio Armani', name: 'Code Absolu', concentration: 'Parfum' },
  { brand: 'Paco Rabanne', name: '1 Million', concentration: 'EDT' },
  { brand: 'Paco Rabanne', name: '1 Million Lucky', concentration: 'EDT' },
  { brand: 'Paco Rabanne', name: '1 Million Prive', concentration: 'EDP' },
  { brand: 'Paco Rabanne', name: '1 Million Elixir', concentration: 'Parfum Intense' },
  { brand: 'Paco Rabanne', name: 'Invictus', concentration: 'EDT' },
  { brand: 'Paco Rabanne', name: 'Invictus Aqua', concentration: 'EDT' },
  { brand: 'Paco Rabanne', name: 'Invictus Victory', concentration: 'EDP Extreme' },
  { brand: 'Jean Paul Gaultier', name: 'Le Male', concentration: 'EDT' },
  { brand: 'Jean Paul Gaultier', name: 'Ultra Male', concentration: 'EDT Intense' },
  { brand: 'Jean Paul Gaultier', name: 'Le Male Le Parfum', concentration: 'EDP' },
  { brand: 'Jean Paul Gaultier', name: 'Le Male Elixir', concentration: 'Parfum' },
  { brand: 'Dolce & Gabbana', name: 'The One for Men', concentration: 'EDP' },
  { brand: 'Dolce & Gabbana', name: 'The One for Men', concentration: 'EDT' },
  { brand: 'Dolce & Gabbana', name: 'Light Blue Eau Intense Pour Homme', concentration: 'EDP' },
  { brand: 'Yves Saint Laurent', name: 'La Nuit de l\'Homme', concentration: 'EDT' },
  { brand: 'Yves Saint Laurent', name: 'Tuxedo', concentration: 'EDP' },
  { brand: 'Dior', name: 'Homme Intense', concentration: 'EDP' },
  { brand: 'Dior', name: 'Homme Parfum', concentration: 'Parfum' },
  { brand: 'Dior', name: 'Fahrenheit', concentration: 'EDT' },
  // Popular Women's / Unisex
  { brand: 'Mugler', name: 'Alien', concentration: 'EDP' },
  { brand: 'Mugler', name: 'Angel', concentration: 'EDP' },
  { brand: 'Carolina Herrera', name: 'Good Girl', concentration: 'EDP' },
  { brand: 'Dior', name: 'Hypnotic Poison', concentration: 'EDT' },
  { brand: 'Dior', name: 'J\'adore', concentration: 'EDP' },
  { brand: 'Dior', name: 'Miss Dior', concentration: 'EDP' },
  { brand: 'Chanel', name: 'Coco Mademoiselle', concentration: 'EDP' },
  { brand: 'Chanel', name: 'Chance Eau Tendre', concentration: 'EDP' },
  { brand: 'Jo Malone', name: 'Wood Sage & Sea Salt', concentration: 'Cologne' },
  { brand: 'Jo Malone', name: 'Myrrh & Tonka', concentration: 'Cologne Intense' },
  { brand: 'Maison Margiela', name: 'Jazz Club', concentration: 'EDT' },
  { brand: 'Maison Margiela', name: 'By the Fireplace', concentration: 'EDT' },
  { brand: 'Maison Margiela', name: 'Lazy Sunday Morning', concentration: 'EDT' },
  { brand: 'Le Labo', name: 'Santal 33', concentration: 'EDP' },
  { brand: 'Le Labo', name: 'Another 13', concentration: 'EDP' },
  { brand: 'Le Labo', name: 'The Noir 29', concentration: 'EDP' },
  { brand: 'Byredo', name: 'Bal d\'Afrique', concentration: 'EDP' },
  { brand: 'Byredo', name: 'Gypsy Water', concentration: 'EDP' },
  { brand: 'Byredo', name: 'Mojave Ghost', concentration: 'EDP' },
  { brand: 'Diptyque', name: 'Philosykos', concentration: 'EDP' },
  { brand: 'Diptyque', name: 'Tam Dao', concentration: 'EDP' },
  { brand: 'Diptyque', name: 'Eau Duelle', concentration: 'EDP' },
]

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function run() {
  const { createClient } = await import('@supabase/supabase-js')
  const { getFragranceInfo } = await import('../lib/cache/fragrance-info')
  const { canonicalSlug } = await import('../lib/cache/slug')

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  console.log(`Starting pre-warm cache script for ${POPULAR_FRAGRANCES.length} fragrances...`)
  console.log('----------------------------------------------------')
  
  let cached = 0
  let fetched = 0
  let failed = 0

  for (let i = 0; i < POPULAR_FRAGRANCES.length; i++) {
    const { brand, name, concentration } = POPULAR_FRAGRANCES[i]
    const title = `${brand} ${name} ${concentration ? `(${concentration})` : ''}`
    const prefix = `${i + 1}/${POPULAR_FRAGRANCES.length} — ${title}`

    try {
      const slug = canonicalSlug(brand, name, concentration)
      
      const { data: cachedRow } = await supabaseAdmin
        .from('fragrance_info_cache')
        .select('canonical_slug')
        .eq('canonical_slug', slug)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle()

      if (cachedRow) {
        console.log(`${prefix}... skipped (cached)`)
        cached++
        continue
      }

      // Not in cache, fetch it
      console.log(`${prefix}... fetching...`)
      await getFragranceInfo(brand, name, concentration, { forceRefresh: true })
      
      console.log(`${prefix}... done`)
      fetched++
      
      // Delay 2s to avoid 429
      await delay(2000)

    } catch (err: any) {
      console.error(`\n[ERROR] ${prefix}... failed: ${err.message || String(err)}\n`)
      failed++
      
      // Delay longer on error to backoff
      await delay(5000)
    }
  }

  console.log('----------------------------------------------------')
  console.log(`PRE-WARM COMPLETE!`)
  console.log(`✅ Cached/Skipped: ${cached}`)
  console.log(`⚡ Newly Fetched:  ${fetched}`)
  console.log(`❌ Failed:         ${failed}`)
}

run()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
