/**
 * Usernames that cannot be claimed by users.
 * These overlap with app routes, API namespaces, or sensitive keywords.
 */
export const RESERVED_USERNAMES = new Set([
  'admin',
  'api',
  'auth',
  'settings',
  'login',
  'signup',
  'onboarding',
  'u',
  'f',
  'c',
  'about',
  'discover',
  'feed',
  'help',
  'terms',
  'privacy',
])

/** Username validation regex: 3-20 chars, lowercase alphanumeric + underscore */
export const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/

/**
 * Validate a username against format rules and reserved list.
 * Returns an error message or null if valid.
 */
export function validateUsername(username: string): string | null {
  if (!username) return 'Username is required'
  if (username.length < 3) return 'Username must be at least 3 characters'
  if (username.length > 20) return 'Username must be at most 20 characters'
  if (!USERNAME_REGEX.test(username)) return 'Only lowercase letters, numbers, and underscores allowed'
  if (RESERVED_USERNAMES.has(username)) return 'This username is reserved'
  return null
}
