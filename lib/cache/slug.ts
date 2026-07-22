/**
 * Generates a stable, URL-safe cache key for fragrance info lookups.
 *
 * IMPORTANT: `isLiquidDeo` MUST be included so that the same fragrance name
 * scanned once as a liquid deo and once as a regular fragrance never share a
 * cache entry.  Omitting it was the root cause of Bug 1 + Bug 2.
 */
export function canonicalSlug(
  brand: string,
  name: string,
  concentration?: string,
  isLiquidDeo?: boolean,
): string {
  const parts = [brand, name]
  if (concentration) {
    parts.push(concentration)
  }
  // Append a stable suffix so deo scans never collide with perfume scans
  if (isLiquidDeo) {
    parts.push('deo')
  }

  return parts
    .join('-')
    .toLowerCase()
    .normalize('NFD')                     // Decompose diacritics
    .replace(/[\u0300-\u036f]/g, '')      // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-')          // Replace non-alphanumeric with dash
    .replace(/^-+|-+$/g, '')              // Trim leading/trailing dashes
}
