/**
 * app/api/wardrobe/ip-geo/route.ts
 * Returns lat/lon from Vercel headers or ipapi.co free tier.
 * No auth required — non-sensitive approximate location.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getClientIP } from '@/lib/get-ip'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'



export async function GET(req: NextRequest) {
  const ip = await getClientIP()
  const limit = await checkRateLimit({
    endpoint: 'ip-geo',
    identifier: ip,
    maxRequests: 10,
    windowMinutes: 60
  })
  if (!limit.allowed) {
    return rateLimitResponse(limit)
  }

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
