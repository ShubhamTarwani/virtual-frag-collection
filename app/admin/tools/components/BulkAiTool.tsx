'use client'

import React, { useState } from 'react'
import { processMetadataBatch } from '../actions'

export default function BulkAiTool({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount)
  const [processing, setProcessing] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  const handleStart = async () => {
    if (count === 0) return
    setProcessing(true)
    setLogs(prev => [...prev, `Starting bulk process for ${count} items...`])

    let remaining = count
    
    try {
      while (remaining > 0) {
        setLogs(prev => [...prev, `Fetching batch of 10...`])
        const processed = await processMetadataBatch()
        
        if (processed === 0) {
          setLogs(prev => [...prev, `No more items could be processed. Stopping.`])
          break
        }
        
        remaining = Math.max(0, remaining - processed)
        setCount(remaining)
        setLogs(prev => [...prev, `Successfully processed ${processed} items. ${remaining} remaining.`])
      }
      setLogs(prev => [...prev, `Bulk processing complete!`])
    } catch (e: unknown) {
      setLogs(prev => [...prev, `Error: ${(e instanceof Error ? e.message : String(e))}`])
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
      <h2 className="text-xl font-bold font-serif text-foreground mb-2">Bulk Metadata Enrichment</h2>
      <p className="text-sm text-muted mb-6">Automatically fill missing perfume metadata using Gemini AI.</p>
      
      <div className="flex items-center justify-between p-4 bg-background border border-border rounded-lg mb-6">
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">Missing Metadata</p>
          <p className="text-3xl font-bold text-accent">{count}</p>
          <p className="text-xs text-muted mt-1">bottles across all users</p>
        </div>
        <button 
          onClick={handleStart}
          disabled={processing || count === 0}
          className="px-6 py-3 bg-accent text-background font-bold text-sm rounded-xl disabled:opacity-50 transition-opacity"
        >
          {processing ? 'Processing...' : 'Auto-fill missing data with AI'}
        </button>
      </div>

      {logs.length > 0 && (
        <div className="bg-background border border-border rounded-lg p-4 font-mono text-xs text-muted max-h-48 overflow-y-auto space-y-1">
          {logs.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </div>
      )}
    </div>
  )
}
