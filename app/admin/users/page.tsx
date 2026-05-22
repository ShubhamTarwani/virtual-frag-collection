import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import UserTable from './components/UserTable'

export default async function UsersPage() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch profiles
  const { data: profiles, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  // Fetch users from auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers()

  if (profileError || authError) {
    return <div className="p-8 text-red-500">Error loading users. Make sure SUPABASE_SERVICE_ROLE_KEY is set.</div>
  }

  // Fetch perfume counts per user
  const { data: perfumes } = await supabaseAdmin.from('perfumes').select('user_id')
  
  const counts: Record<string, number> = {}
  perfumes?.forEach(p => {
    counts[p.user_id] = (counts[p.user_id] || 0) + 1
  })

  // Merge data
  const users = profiles?.map(profile => {
    const authUser = authData.users.find(u => u.id === profile.id)
    return {
      ...profile,
      email: authUser?.email || 'N/A',
      last_sign_in_at: authUser?.last_sign_in_at,
      bottle_count: counts[profile.id] || 0
    }
  }) || []

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-serif text-foreground">User Management</h1>
        <p className="text-muted mt-2">Manage registered users and their account status.</p>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <UserTable users={users} />
      </div>
    </div>
  )
}
