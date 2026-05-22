'use client'

import React, { useState, KeyboardEvent, useEffect } from 'react'
import Link from 'next/link'
import { toggleUserSuspension, updateAccountNumber } from '../actions'
import { useRouter } from 'next/navigation'

type User = {
  id: string
  username: string
  email: string
  created_at: string
  last_sign_in_at?: string
  bottle_count: number
  suspended: boolean
  account_number: number | null
}

export default function UserTable({ users }: { users: User[] }) {
  const [search, setSearch] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [editingAccNumId, setEditingAccNumId] = useState<string | null>(null)
  const [editAccNumValue, setEditAccNumValue] = useState<string>('')
  const router = useRouter()

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  const handleToggleSuspend = async (user: User) => {
    const action = user.suspended ? 'restore' : 'suspend'
    if (!confirm(`Are you sure you want to ${action} user @${user.username}?`)) return

    setLoadingId(user.id)
    try {
      await toggleUserSuspension(user.id, user.suspended)
      router.refresh()
    } catch (e) {
      alert('Failed to update user status.')
    } finally {
      setLoadingId(null)
    }
  }

  const handleEditAccNum = (user: User) => {
    setEditingAccNumId(user.id)
    setEditAccNumValue(user.account_number !== null ? String(user.account_number) : '')
  }

  const handleSaveAccNum = async (user: User) => {
    if (editingAccNumId !== user.id) return

    setEditingAccNumId(null)
    const parsed = editAccNumValue.trim() === '' ? null : parseInt(editAccNumValue, 10)
    
    // If no change, return
    if (parsed === user.account_number) return
    
    if (parsed !== null && isNaN(parsed)) {
      alert('Invalid account number. Must be an integer.')
      return
    }

    setLoadingId('acc_' + user.id)
    try {
      await updateAccountNumber(user.id, parsed)
      router.refresh()
    } catch (e: any) {
      alert(e.message || 'Failed to update account number.')
    } finally {
      setLoadingId(null)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, user: User) => {
    if (e.key === 'Enter') {
      handleSaveAccNum(user)
    } else if (e.key === 'Escape') {
      setEditingAccNumId(null)
    }
  }

  return (
    <div>
      <div className="p-4 border-b border-border bg-surface-hover/30">
        <input
          type="text"
          placeholder="Search by username or email..."
          className="w-full max-w-sm px-4 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-accent"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-surface-hover/50 text-muted uppercase text-xs">
            <tr>
              <th className="px-6 py-4 font-semibold">User</th>
              <th className="px-6 py-4 font-semibold">Acc #</th>
              <th className="px-6 py-4 font-semibold">Joined</th>
              <th className="px-6 py-4 font-semibold">Last Active</th>
              <th className="px-6 py-4 font-semibold">Bottles</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filteredUsers.map(u => (
              <tr key={u.id} className="hover:bg-surface-hover/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-foreground">
                    <Link href={`/u/${u.username}`} className="hover:text-accent hover:underline">
                      @{u.username}
                    </Link>
                  </div>
                  <div className="text-muted text-xs">{u.email}</div>
                </td>
                <td className="px-6 py-4">
                  {editingAccNumId === u.id ? (
                    <input
                      autoFocus
                      type="number"
                      min="0"
                      className="w-16 px-2 py-1 bg-background border border-accent rounded text-sm outline-none"
                      value={editAccNumValue}
                      onChange={(e) => setEditAccNumValue(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, u)}
                      onBlur={() => handleSaveAccNum(u)}
                    />
                  ) : (
                    <div 
                      className={`cursor-pointer inline-flex items-center justify-center px-2 py-1 rounded text-xs font-semibold border ${
                        u.account_number === 0 ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' :
                        u.account_number !== null && u.account_number < 15 ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' :
                        u.account_number !== null ? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30' :
                        'bg-surface text-muted border-border border-dashed hover:border-accent'
                      }`}
                      onClick={() => handleEditAccNum(u)}
                      title="Click to edit Account #"
                    >
                      {loadingId === 'acc_' + u.id ? '...' : u.account_number !== null ? `#${u.account_number}` : 'Assign'}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-muted">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-muted">
                  {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center justify-center px-2 py-1 rounded-full bg-accent/10 text-accent text-xs font-bold">
                    {u.bottle_count}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {u.suspended ? (
                    <span className="text-red-500 font-medium text-xs bg-red-500/10 px-2 py-1 rounded-full">Suspended</span>
                  ) : (
                    <span className="text-green-500 font-medium text-xs bg-green-500/10 px-2 py-1 rounded-full">Active</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleToggleSuspend(u)}
                    disabled={loadingId === u.id}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      u.suspended 
                        ? 'bg-surface border border-border hover:bg-surface-hover text-foreground'
                        : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                    }`}
                  >
                    {loadingId === u.id ? '...' : u.suspended ? 'Restore' : 'Suspend'}
                  </button>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-muted">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
