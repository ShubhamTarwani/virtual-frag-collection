import { createHash } from 'crypto'

export type WardrobeContext = {
  temp_bucket: string    // '<15'|'15-22'|'22-28'|'28-32'|'>32'
  humidity_bucket: string// 'low'|'mid'|'high'
  condition: string
  time_of_day: string
  season: string
  occasion?: string
  mood?: string
  setting?: string
  who_with?: string
  collection_fingerprint: string  // hash of sorted bottle IDs the user owns
}

export function bucketTemperature(temp?: number | null): string {
  if (temp == null) return 'unknown'
  if (temp < 15) return '<15'
  if (temp <= 22) return '15-22'
  if (temp <= 28) return '22-28'
  if (temp <= 32) return '28-32'
  return '>32'
}

export function bucketHumidity(humidity?: number | null): string {
  if (humidity == null) return 'unknown'
  if (humidity < 30) return 'low'
  if (humidity <= 60) return 'mid'
  return 'high'
}

export function generateCollectionFingerprint(bottleIds: string[]): string {
  const sorted = [...bottleIds].sort()
  return createHash('sha256').update(sorted.join(',')).digest('hex')
}

export function hashContext(ctx: WardrobeContext): string {
  const normalized = {
    t: ctx.temp_bucket,
    h: ctx.humidity_bucket,
    c: ctx.condition.toLowerCase().trim(),
    tod: ctx.time_of_day,
    s: ctx.season,
    occ: ctx.occasion?.toLowerCase() || '',
    m: ctx.mood?.toLowerCase() || '',
    set: ctx.setting?.toLowerCase() || '',
    who: ctx.who_with?.toLowerCase() || '',
    fp: ctx.collection_fingerprint,
  }

  const str = JSON.stringify(normalized)
  return createHash('sha256').update(str).digest('hex')
}
