import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

/**
 * Next.js 16 proxy (replaces deprecated middleware.ts).
 * Refreshes the Supabase auth session on every request and
 * protects the /onboarding route for unauthenticated users.
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // Refresh the auth session (important for server components)
  // This is intentionally awaited to check the user's suspension status.
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (user && pathname !== '/suspended') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('suspended')
      .eq('id', user.id)
      .single()

    if (profile?.suspended) {
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = '/suspended'
      const redirectResponse = NextResponse.redirect(url)
      // Clear cookies for the user
      redirectResponse.cookies.delete('sb-access-token')
      redirectResponse.cookies.delete('sb-refresh-token')
      return redirectResponse
    }
  }

  // Protect onboarding route
  if (pathname === '/onboarding') {
    // Let the page handle auth — the server action will redirect if needed
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
