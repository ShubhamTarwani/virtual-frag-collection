/**
 * app/api/wardrobe/ip-geo/route.ts
 * Returns lat/lon from Vercel headers or ipapi.co free tier.
 * No auth required — non-sensitive approximate location.
 */
import { NextRequest, NextResponse } from 'next/server'

// Top 20 Indian cities as fallback
export const INDIAN_CITIES = [
  { name: 'Mumbai', lat: 19.076, lon: 72.877 },
  { name: 'Delhi', lat: 28.679, lon: 77.069 },
  { name: 'Bangalore', lat: 12.972, lon: 77.594 },
  { name: 'Hyderabad', lat: 17.385, lon: 78.487 },
  { name: 'Chennai', lat: 13.083, lon: 80.271 },
  { name: 'Kolkata', lat: 22.573, lon: 88.364 },
  { name: 'Pune', lat: 18.520, lon: 73.856 },
  { name: 'Ahmedabad', lat: 23.023, lon: 72.572 },
  { name: 'Jaipur', lat: 26.913, lon: 75.787 },
  { name: 'Surat', lat: 21.170, lon: 72.831 },
  { name: 'Lucknow', lat: 26.847, lon: 80.947 },
  { name: 'Kanpur', lat: 26.449, lon: 80.331 },
  { name: 'Nagpur', lat: 21.146, lon: 79.089 },
  { name: 'Patna', lat: 25.594, lon: 85.138 },
  { name: 'Indore', lat: 22.719, lon: 75.857 },
  { name: 'Bhopal', lat: 23.259, lon: 77.413 },
  { name: 'Visakhapatnam', lat: 17.686, lon: 83.218 },
  { name: 'Chandigarh', lat: 30.741, lon: 76.779 },
  { name: 'Kochi', lat: 9.932, lon: 76.267 },
  { name: 'Guwahati', lat: 26.144, lon: 91.736 },
]

export async function GET(req: NextRequest) {
  // 1. Try Vercel injected headers (fastest, most accurate)
  const vercelLat = req.headers.get('x-vercel-ip-latitude')
  const vercelLon = req.headers.get('x-vercel-ip-longitude')
  if (vercelLat && vercelLon) {
    return NextResponse.json({
      lat: parseFloat(vercelLat),
      lon: parseFloat(vercelLon),
      source: 'vercel',
    })
  }

  // 2. Try ipapi.co free tier
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''
    const url = ip ? `https://ipapi.co/${ip}/json/` : 'https://ipapi.co/json/'
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) })
    if (res.ok) {
      const data = await res.json()
      if (data.latitude && data.longitude) {
        return NextResponse.json({
          lat: data.latitude,
          lon: data.longitude,
          city: data.city,
          source: 'ipapi',
        })
      }
    }
  } catch {
    // Fall through to default
  }

  // 3. Fallback: return null so client can show city picker
  return NextResponse.json({ lat: null, lon: null, source: 'none' })
}
