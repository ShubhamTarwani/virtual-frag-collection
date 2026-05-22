import { createClient } from '@supabase/supabase-js'
import React from 'react'
import Link from 'next/link'

export default async function AdminDashboard() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch counts
  const { count: usersCount } = await supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true })
  const { count: bottlesCount } = await supabaseAdmin.from('perfumes').select('*', { count: 'exact', head: true })
  const { count: wearLogsCount } = await supabaseAdmin.from('wear_logs').select('*', { count: 'exact', head: true })
  
  // New users this week
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  const { count: newUsersCount } = await supabaseAdmin
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', oneWeekAgo.toISOString())

  // Recent Signups
  const { data: recentProfiles } = await supabaseAdmin
    .from('profiles')
    .select('id, username, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  // Since we can't easily join auth.users without a custom function, we'll fetch auth users and match
  const { data: authData } = await supabaseAdmin.auth.admin.listUsers()
  const recentSignups = recentProfiles?.map(p => {
    const authUser = authData?.users.find(u => u.id === p.id)
    return { ...p, email: authUser?.email || 'N/A' }
  }) || []

  // Recent Bottles
  const { data: recentBottles } = await supabaseAdmin
    .from('perfumes')
    .select('id, name, brand, created_at, profiles!inner(username)')
    .order('created_at', { ascending: false })
    .limit(10)

  // Recent Wear Logs
  const { data: recentLogs } = await supabaseAdmin
    .from('wear_logs')
    .select('id, date, created_at, perfumes!inner(name, brand), profiles!inner(username)')
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-serif text-foreground">Admin Dashboard</h1>
        <p className="text-muted mt-2">Platform overview and recent activity.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Users" value={usersCount ?? 0} />
        <StatCard title="Total Bottles" value={bottlesCount ?? 0} />
        <StatCard title="Total Wear Logs" value={wearLogsCount ?? 0} />
        <StatCard title="New Users (7d)" value={newUsersCount ?? 0} highlight />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold font-serif text-foreground">Recent Signups</h2>
          <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
            <ul className="divide-y divide-border/50">
              {recentSignups.map(u => (
                <li key={u.id} className="p-4 flex items-center justify-between">
                  <div>
                    <Link href={`/u/${u.username}`} className="font-medium text-foreground hover:text-accent hover:underline">@{u.username}</Link>
                    <p className="text-xs text-muted">{u.email}</p>
                  </div>
                  <span className="text-xs text-muted">{new Date(u.created_at).toLocaleDateString()}</span>
                </li>
              ))}
              {recentSignups.length === 0 && <li className="p-4 text-muted text-sm text-center">No recent signups.</li>}
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold font-serif text-foreground">Recent Bottles Added</h2>
          <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
            <ul className="divide-y divide-border/50">
              {recentBottles?.map(b => (
                <li key={b.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{b.name}</p>
                    <p className="text-xs text-muted">{b.brand}</p>
                  </div>
                  <div className="text-xs text-muted text-right">
                    by <Link href={`/u/${(b.profiles as any).username}`} className="hover:text-accent">@{(b.profiles as any).username}</Link>
                  </div>
                </li>
              ))}
              {!recentBottles?.length && <li className="p-4 text-muted text-sm text-center">No recent bottles.</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, highlight }: { title: string, value: number, highlight?: boolean }) {
  return (
    <div className={`p-6 rounded-xl border shadow-sm ${highlight ? 'bg-accent/10 border-accent/20' : 'bg-surface border-border'}`}>
      <h3 className="text-sm font-medium text-muted">{title}</h3>
      <p className={`text-3xl font-bold mt-2 ${highlight ? 'text-accent' : 'text-foreground'}`}>{value.toLocaleString()}</p>
    </div>
  )
}
