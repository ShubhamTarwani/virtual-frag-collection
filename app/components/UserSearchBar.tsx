"use client"

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { searchUsers } from '@/app/actions/social'

export default function UserSearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setIsSearching(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const data = await searchUsers(query)
        setResults(data || [])
        setIsOpen(true)
      } catch (e) {
        console.error(e)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  return (
    <div ref={wrapperRef} className="relative w-full max-w-xs mx-4 hidden sm:block">
      <div className="relative">
        <input
          type="text"
          placeholder="Search collectors..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => {
            if (query.trim()) setIsOpen(true)
          }}
          className="w-full bg-surface border border-border rounded-full pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-colors"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {isOpen && (query.trim().length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-xl shadow-lg overflow-hidden z-50">
          {isSearching ? (
            <div className="p-4 text-center text-sm text-muted">Searching...</div>
          ) : results.length > 0 ? (
            <ul className="max-h-64 overflow-y-auto">
              {results.map((user) => (
                <li key={user.id}>
                  <Link
                    href={`/u/${user.username}`}
                    onClick={() => {
                      setIsOpen(false)
                      setQuery('')
                    }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-colors border-b border-border/50 last:border-0"
                  >
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent shrink-0">
                        {(user.display_name || user.username)[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-sm font-medium text-foreground truncate">
                        {user.display_name || user.username}
                      </div>
                      <div className="text-xs text-muted truncate">
                        @{user.username}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-sm text-muted">No collectors found.</div>
          )}
        </div>
      )}
    </div>
  )
}
