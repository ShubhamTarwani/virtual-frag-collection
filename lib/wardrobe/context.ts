/**
 * lib/wardrobe/context.ts
 * Server-only context detection layer.
 * Handles season/time detection and weather fetching with caching.
 */
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WeatherCondition = 'sunny' | 'cloudy' | 'rainy' | 'windy' | 'unknown'
export type Season = 'summer' | 'monsoon' | 'post_monsoon' | 'winter'
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'

export type WeatherData = {
  temp: number           // Celsius
  humidity: number       // 0-100
  condition: WeatherCondition
}

export type AutoContext = {
  temp: number | null
  humidity: number | null
  condition: WeatherCondition | null
  timeOfDay: TimeOfDay
  dayOfWeek: number      // 0=Sunday … 6=Saturday
  season: Season
  lat: number | null
  lon: number | null
  weatherAvailable: boolean
}

// ---------------------------------------------------------------------------
// Season detection (Indian climate)
// ---------------------------------------------------------------------------

export function detectSeason(date: Date): Season {
  const month = date.getMonth() + 1 // 1-indexed
  if (month >= 3 && month <= 6) return 'summer'       // Mar-Jun
  if (month >= 7 && month <= 9) return 'monsoon'      // Jul-Sep
  if (month >= 10 && month <= 11) return 'post_monsoon' // Oct-Nov
  return 'winter'                                       // Dec-Feb
}

// ---------------------------------------------------------------------------
// Time of day detection
// ---------------------------------------------------------------------------

export function detectTimeOfDay(date: Date): TimeOfDay {
  const hour = date.getHours()
  if (hour >= 5 && hour <= 11) return 'morning'
  if (hour >= 12 && hour <= 16) return 'afternoon'
  if (hour >= 17 && hour <= 20) return 'evening'
  return 'night' // 21-4
}

// ---------------------------------------------------------------------------
// Map OWM weather code to our condition enum
// ---------------------------------------------------------------------------

function mapOWMCondition(weatherId: number): WeatherCondition {
  if (weatherId >= 200 && weatherId < 600) return 'rainy'
  if (weatherId >= 600 && weatherId < 700) return 'rainy'
  if (weatherId >= 700 && weatherId < 800) return 'windy'
  if (weatherId === 800) return 'sunny'
  if (weatherId > 800) return 'cloudy'
  return 'unknown'
}

// ---------------------------------------------------------------------------
// Cache key for weather
// ---------------------------------------------------------------------------

function buildCacheKey(lat: number, lon: number, date: Date): string {
  const rounded_lat = Math.round(lat * 10) / 10  // 1 decimal precision
  const rounded_lon = Math.round(lon * 10) / 10
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  return `${rounded_lat},${rounded_lon},${year}-${month}-${day}-${hour}`
}

// ---------------------------------------------------------------------------
// Read weather from Supabase cache (1-hour TTL)
// ---------------------------------------------------------------------------

export async function getCachedWeather(lat: number, lon: number): Promise<WeatherData | null> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const now = new Date()
    const key = buildCacheKey(lat, lon, now)

    const { data, error } = await supabase
      .from('weather_cache')
      .select('data, fetched_at')
      .eq('cache_key', key)
      .single()

    if (error || !data) return null

    // TTL check: 1 hour
    const fetchedAt = new Date(data.fetched_at)
    const ageMs = now.getTime() - fetchedAt.getTime()
    if (ageMs > 60 * 60 * 1000) return null

    return data.data as WeatherData
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Fetch from OpenWeatherMap and write to cache
// ---------------------------------------------------------------------------

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY
  if (!apiKey || apiKey === 'your_owm_key_here') {
    throw new Error('OPENWEATHERMAP_API_KEY not configured')
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
  const res = await fetch(url, {
    next: { revalidate: 3600 }, // Next.js data cache, also 1h
  })

  if (!res.ok) {
    throw new Error(`OWM API error: ${res.status}`)
  }

  const json = await res.json()
  const weatherData: WeatherData = {
    temp: Math.round(json.main.temp * 10) / 10,
    humidity: json.main.humidity,
    condition: mapOWMCondition(json.weather?.[0]?.id ?? 800),
  }

  // Write to cache (upsert)
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const now = new Date()
    const key = buildCacheKey(lat, lon, now)

    await supabase
      .from('weather_cache')
      .upsert({ cache_key: key, data: weatherData, fetched_at: now.toISOString() })
  } catch {
    // Non-fatal — caching is best-effort
  }

  return weatherData
}

// ---------------------------------------------------------------------------
// Main: Build full AutoContext
// ---------------------------------------------------------------------------

export async function buildAutoContext(lat: number | null, lon: number | null): Promise<AutoContext> {
  const now = new Date()
  const season = detectSeason(now)
  const timeOfDay = detectTimeOfDay(now)
  const dayOfWeek = now.getDay()

  if (lat === null || lon === null) {
    return { temp: null, humidity: null, condition: null, timeOfDay, dayOfWeek, season, lat, lon, weatherAvailable: false }
  }

  // Try cache first, then live fetch (with 5s timeout)
  let weatherData: WeatherData | null = null
  try {
    weatherData = await getCachedWeather(lat, lon)
    if (!weatherData) {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('OWM timeout')), 5000)
      )
      weatherData = await Promise.race([fetchWeather(lat, lon), timeout])
    }
  } catch {
    // Graceful degradation — weather unavailable
    weatherData = null
  }

  if (!weatherData) {
    return { temp: null, humidity: null, condition: null, timeOfDay, dayOfWeek, season, lat, lon, weatherAvailable: false }
  }

  return {
    temp: weatherData.temp,
    humidity: weatherData.humidity,
    condition: weatherData.condition,
    timeOfDay,
    dayOfWeek,
    season,
    lat,
    lon,
    weatherAvailable: true,
  }
}
