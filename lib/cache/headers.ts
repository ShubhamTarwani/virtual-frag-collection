/**
 * Generates cache headers for public static pages.
 * Supports stale-while-revalidate (SWR) behavior to serve fast stale pages
 * while fetching updates in the background.
 *
 * @param sMaxAge Shared cache TTL (seconds) - Default: 300 (5 mins)
 * @param swr Stale-while-revalidate window (seconds) - Default: 600 (10 mins)
 */
export const publicCacheHeaders = (sMaxAge = 300, swr = 600) => ({
  'Cache-Control': `public, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`,
  'CDN-Cache-Control': `public, s-maxage=${sMaxAge * 2}`,
  'Vercel-CDN-Cache-Control': `public, s-maxage=${sMaxAge * 2}`,
});

/**
 * Generates headers to completely bypass caching (useful for API routes and auth gates).
 */
export const noCacheHeaders = () => ({
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
});
