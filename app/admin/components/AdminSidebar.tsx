import Link from 'next/link'
import React from 'react'

export default function AdminSidebar({ adminEmail }: { adminEmail: string }) {
  return (
    <div className="w-64 shrink-0 bg-surface border-r border-border min-h-[calc(100vh-3.5rem)] flex flex-col hidden md:flex">
      <div className="p-6 flex flex-col gap-2 flex-1">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Admin Panel</h3>
        <Link href="/admin" className="px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-hover rounded-xl transition-colors">
          Dashboard
        </Link>
        <Link href="/admin/fragrances" className="px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-hover rounded-xl transition-colors">
          Master Fragrances
        </Link>
        <Link href="/admin/users" className="px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-hover rounded-xl transition-colors">
          User Management
        </Link>
        <Link href="/admin/tools" className="px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-hover rounded-xl transition-colors">
          AI Tools
        </Link>
      </div>
      <div className="p-6 border-t border-border mt-auto">
        <p className="text-xs text-muted">Admin User</p>
        <p className="text-sm font-medium text-foreground truncate" title={adminEmail}>{adminEmail}</p>
      </div>
    </div>
  )
}
