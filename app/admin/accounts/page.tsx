'use client'

import React, { useState, useEffect } from 'react'
import { getAccounts, assignAccountNumber, assignFounderNumber, checkNumberHolder } from '@/app/actions/admin'

type AccountProfile = {
  id: string
  username: string
  display_name: string | null
  account_number: number | null
}

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<AccountProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Modal state
  const [editingUser, setEditingUser] = useState<AccountProfile | null>(null)
  const [newNumber, setNewNumber] = useState<string>('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [showFounderModal, setShowFounderModal] = useState<AccountProfile | null>(null)
  const [holderUsername, setHolderUsername] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  const fetchAccounts = async (q?: string) => {
    setLoading(true)
    setError('')
    try {
      const data = await getAccounts(q)
      setAccounts(data || [])
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : String(err)))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line
    fetchAccounts()
  }, [])

  useEffect(() => {
    const check = async () => {
      const num = parseInt(newNumber, 10)
      if (isNaN(num) || num <= 0) {
        setHolderUsername(null)
        return
      }
      setIsChecking(true)
      try {
        const username = await checkNumberHolder(num)
        if (editingUser && username === editingUser.username) {
          setHolderUsername(null) // Already holds it
        } else {
          setHolderUsername(username)
        }
      } catch (err) {
        setHolderUsername(null)
      } finally {
        setIsChecking(false)
      }
    }
    const t = setTimeout(check, 300)
    return () => clearTimeout(t)
  }, [newNumber, editingUser])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchAccounts(search)
  }

  const handleAssign = async () => {
    if (!editingUser) return
    const num = parseInt(newNumber, 10)
    if (isNaN(num) || num < 0) {
      setError('Please enter a valid positive number')
      return
    }

    setIsAssigning(true)
    setError('')
    setSuccess('')
    
    try {
      const res = await assignAccountNumber(editingUser.id, num)
      if (res.success) {
        setSuccess(`Successfully assigned #${num} to ${editingUser.username}`)
        setEditingUser(null)
        setNewNumber('')
        setHolderUsername(null)
        fetchAccounts(search)
      } else {
        setError(res.error || 'Failed to assign number')
      }
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : String(err)))
    } finally {
      setIsAssigning(false)
    }
  }

  const handleAssignFounder = async () => {
    if (!showFounderModal) return
    setIsAssigning(true)
    setError('')
    setSuccess('')
    
    try {
      const res = await assignFounderNumber(showFounderModal.id)
      if (res.success) {
        setSuccess(`Successfully assigned FOUNDER #0 to ${showFounderModal.username}`)
        setShowFounderModal(null)
        fetchAccounts(search)
      } else {
        setError(res.error || 'Failed to assign founder number')
      }
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : String(err)))
    } finally {
      setIsAssigning(false)
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-serif text-foreground">Account Numbers</h1>
          <p className="text-sm text-muted mt-1">Manage and assign collector account numbers.</p>
        </div>
      </div>

      {(error || success) && (
        <div className={`p-4 rounded-xl mb-6 text-sm ${error ? 'bg-danger/10 text-danger border border-danger/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
          {error || success}
        </div>
      )}

      <form onSubmit={handleSearch} className="mb-6 flex gap-3">
        <input
          type="text"
          placeholder="Search by username..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 rounded-xl border border-border bg-surface px-4 py-2 text-sm text-foreground focus:border-accent outline-none"
        />
        <button type="submit" className="rounded-xl bg-surface-hover border border-border px-4 py-2 text-sm font-medium hover:text-accent transition-colors">
          Search
        </button>
      </form>

      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-hover border-b border-border text-muted">
              <tr>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[10px]">User</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[10px]">Account #</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[10px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-muted">Loading...</td></tr>
              ) : accounts.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-muted">No users found.</td></tr>
              ) : (
                accounts.map(acc => (
                  <tr key={acc.id} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{acc.username}</div>
                      <div className="text-xs text-muted mt-0.5">{acc.display_name || 'No display name'}</div>
                    </td>
                    <td className="px-6 py-4">
                      {acc.account_number !== null ? (
                        <span className="font-mono text-accent">#{acc.account_number.toString().padStart(4, '0')}</span>
                      ) : (
                        <span className="text-muted italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setEditingUser(acc)}
                        className="text-xs font-medium text-muted hover:text-accent border border-border rounded px-3 py-1 mr-2 transition-colors"
                      >
                        Reassign
                      </button>
                      <button 
                        onClick={() => setShowFounderModal(acc)}
                        className="text-xs font-bold text-[#c8a855] hover:bg-[#c8a855]/10 border border-[#c8a855]/30 rounded px-3 py-1 transition-colors"
                      >
                        Make Founder
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editing Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-foreground mb-1">Reassign Number</h3>
            <p className="text-sm text-muted mb-4">Assigning a new number to <span className="font-semibold text-foreground">{editingUser.username}</span>.</p>
            
            <div className="mb-4">
              <label className="block text-xs font-medium text-muted mb-1 uppercase tracking-wider">New Number</label>
              <input
                type="number"
                min="1"
                value={newNumber}
                onChange={e => setNewNumber(e.target.value)}
                placeholder="e.g. 1045"
                className="w-full rounded-xl border border-border bg-background px-4 py-2 text-foreground focus:border-accent outline-none"
              />
              {holderUsername ? (
                <p className="text-xs text-amber-500 mt-2 font-medium bg-amber-500/10 p-2 rounded border border-amber-500/20">
                  ⚠️ Number #{newNumber.padStart(4, '0')} is currently held by @{holderUsername} — this will swap their numbers.
                </p>
              ) : (
                <p className="text-[10px] text-muted mt-2">Note: Numbers 1-20 and 1155 can be assigned by admins. #0 requires Founder action.</p>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button 
                onClick={() => {
                  setEditingUser(null)
                  setHolderUsername(null)
                  setNewNumber('')
                }}
                className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleAssign}
                disabled={isAssigning || isChecking || !newNumber}
                className="px-4 py-2 text-sm font-bold bg-accent text-background rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {isAssigning ? 'Saving...' : (holderUsername ? 'Swap Numbers' : 'Assign')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Founder Modal */}
      {showFounderModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-[#c8a855]/50 rounded-2xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#c8a855]/10 to-transparent pointer-events-none"></div>
            <div className="relative z-10 text-center">
              <div className="w-16 h-16 rounded-full bg-[#c8a855]/20 flex items-center justify-center mx-auto mb-4 border border-[#c8a855]/40 text-4xl">👑</div>
              <h3 className="text-xl font-bold text-[#c8a855] mb-2 font-serif">Assign Founder Status</h3>
              <p className="text-sm text-foreground/80 mb-6">
                Are you absolutely sure you want to assign the <strong>Founder (#0000)</strong> badge to <span className="font-bold text-foreground">{showFounderModal.username}</span>? There can only be one founder.
              </p>
              
              <div className="flex gap-3 justify-center mt-8">
                <button 
                  onClick={() => setShowFounderModal(null)}
                  className="px-6 py-2.5 text-sm font-medium text-muted hover:text-foreground border border-border rounded-xl transition-colors bg-background"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAssignFounder}
                  disabled={isAssigning}
                  className="px-6 py-2.5 text-sm font-bold bg-gradient-to-r from-[#c8a855] to-[#b89542] text-background rounded-xl shadow-[0_0_15px_rgba(200,168,85,0.4)] hover:shadow-[0_0_25px_rgba(200,168,85,0.6)] transition-all disabled:opacity-50"
                >
                  {isAssigning ? 'Confirming...' : 'Yes, Make Founder'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
