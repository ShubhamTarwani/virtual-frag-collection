'use client'

import { useEffect, useState } from 'react'

export function BulkImportProgress({ jobIds }: { jobIds: string[] }) {
  const [status, setStatus] = useState<{
    pending: number
    processing: number
    done: number
    error: number
  } | null>(null)
  
  const [errors, setErrors] = useState<{id: string; message: string}[]>([])

  useEffect(() => {
    if (!jobIds || jobIds.length === 0) return

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/queue/status?ids=${jobIds.join(',')}`)
        if (res.ok) {
          const data = await res.json()
          setStatus(data.counts)
          setErrors(data.errors)

          if (data.counts.pending === 0 && data.counts.processing === 0) {
            // It will clear on unmount or we can just rely on the server returning done
          }
        }
      } catch (err) {
        console.error('Failed to fetch bulk import status', err)
      }
    }

    fetchStatus()
    const intervalId = setInterval(fetchStatus, 3000)

    return () => clearInterval(intervalId)
  }, [jobIds])

  if (!jobIds || jobIds.length === 0) return null
  if (!status) return <div className="text-sm text-gray-500">Initializing import tracker...</div>

  const total = jobIds.length
  const completed = status.done + status.error
  const percent = Math.round((completed / total) * 100)

  return (
    <div className="mt-4 p-4 border rounded-md bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800">
      <h3 className="text-sm font-medium mb-2">Bulk Import Progress</h3>
      
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-2">
        <div 
          className="bg-black dark:bg-white h-2.5 rounded-full transition-all duration-500" 
          style={{ width: `${percent}%` }}
        ></div>
      </div>
      
      <div className="text-xs text-gray-600 dark:text-gray-400 flex justify-between">
        <span>{completed} of {total} processed</span>
        <span>{percent}%</span>
      </div>
      
      <div className="mt-3 text-xs flex gap-3 text-gray-500">
        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gray-400"></div> {status.pending} pending</span>
        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div> {status.processing} processing</span>
        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> {status.done} done</span>
        {status.error > 0 && <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> {status.error} errors</span>}
      </div>

      {errors.length > 0 && (
        <div className="mt-4 text-xs text-red-600 dark:text-red-400 max-h-24 overflow-y-auto">
          <strong>Recent Errors:</strong>
          <ul className="list-disc pl-4 mt-1">
            {errors.slice(0, 5).map(e => (
              <li key={e.id}>{e.message}</li>
            ))}
            {errors.length > 5 && <li>... and {errors.length - 5} more</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
