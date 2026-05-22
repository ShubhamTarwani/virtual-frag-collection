/**
 * Route Segment Configuration Template for ISR.
 *
 * How to apply this to a route:
 * In your page.tsx file (e.g., app/u/[username]/page.tsx), add:
 *
 * ```typescript
 * import { publicPageConfig } from '@/lib/cache/route-config'
 *
 * export const revalidate = publicPageConfig.revalidate;
 * export const dynamic = publicPageConfig.dynamic;
 * export const dynamicParams = publicPageConfig.dynamicParams;
 * ```
 */

export const publicPageConfig = {
  revalidate: 3600, // Revalidate page at most once every hour (3600 seconds)
  dynamic: 'force-static' as const, // Render as static HTML by default
  dynamicParams: true, // Allow dynamic paths (new users) that weren't generated at build time
};
