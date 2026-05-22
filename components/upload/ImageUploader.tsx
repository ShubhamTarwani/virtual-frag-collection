"use client"
/* eslint-disable @next/next/no-img-element */

import React, { useState, useRef } from 'react'

interface ImageUploaderProps {
  onUploaded: (url: string, publicId: string) => void;
  folder?: string; // Kept for prop compat, but route forces 'perfumes'
  accept?: string;
}

export default function ImageUploader({
  onUploaded,
  folder = 'perfumes',
  accept = 'image/jpeg, image/png, image/webp',
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    
    // Client-side Validation
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
    const MAX_SIZE = 10 * 1024 * 1024  // 10MB

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Only JPG, PNG, or WebP images allowed')
      return
    }
    if (file.size > MAX_SIZE) {
      setError('Image must be under 10MB')
      return
    }

    // Set local preview instantly
    const localUrl = URL.createObjectURL(file)
    setPreviewUrl(localUrl)

    try {
      setUploading(true)
      setProgress(10)

      // Step 1 - fetch signature from presign route
      const presignResponse = await fetch('/api/upload/presign', { method: 'POST' })

      if (!presignResponse.ok) {
        const errJson = await presignResponse.json().catch(() => ({}))
        throw new Error(errJson.error || 'Failed to authorize upload')
      }

      const { signature, timestamp, apiKey, cloudName, folder: targetFolder } = await presignResponse.json()
      setProgress(30)

      // Step 2 - upload directly to Cloudinary from the browser
      const formData = new FormData()
      formData.append('file', file)
      formData.append('signature', signature)
      formData.append('timestamp', timestamp.toString())
      formData.append('api_key', apiKey)
      formData.append('folder', targetFolder || folder)

      const xhr = new XMLHttpRequest()
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, true)

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          // Map range 30% -> 95% during upload
          const uploadProgress = Math.round((event.loaded / event.total) * 65) + 30
          setProgress(uploadProgress)
        }
      }

      const uploadPromise = new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const res = JSON.parse(xhr.responseText)
              resolve(res)
            } catch {
              reject(new Error('Invalid upload response format'))
            }
          } else {
            try {
              const res = JSON.parse(xhr.responseText)
              reject(new Error(res.error?.message || 'Upload to storage failed'))
            } catch {
              reject(new Error(`Upload failed with status code ${xhr.status}`))
            }
          }
        }
        xhr.onerror = () => reject(new Error('Network error during upload'))
        xhr.onabort = () => reject(new Error('Upload cancelled'))
      })

      xhr.send(formData)
      const uploadResult = await uploadPromise

      // Finalize progress
      setProgress(100)
      
      // Fire completion callback (Step 3 will be handled by the parent saving to Supabase)
      onUploaded(uploadResult.secure_url, uploadResult.public_id)

    } catch (err: unknown) {
      console.error('Image upload pipeline failure:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred during image upload')
      // Reset preview on failure
      setPreviewUrl(null)
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="w-full space-y-3">
      <div 
        onClick={(!uploading) ? triggerFileInput : undefined}
        className={`relative flex flex-col items-center justify-center border border-dashed rounded-2xl p-6 bg-surface transition-all duration-300 ${
          uploading 
            ? 'border-accent/40 bg-surface/50 cursor-not-allowed' 
            : 'border-border-light hover:border-accent hover:bg-surface-hover cursor-pointer'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          accept={accept}
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
        />

        {previewUrl ? (
          <div className="relative w-full max-w-[120px] aspect-square rounded-xl overflow-hidden shadow-md mb-2">
            <img 
              src={previewUrl} 
              alt="Preview" 
              className="h-full w-full object-contain p-1"
            />
            {uploading && (
              <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center">
            <div className="text-3xl mb-2 opacity-50">📸</div>
            <div className="text-sm font-medium text-foreground">
              Click to select or drop a photo
            </div>
            <div className="text-xs text-muted mt-1">
              Supports JPEG, PNG, or WebP (max 10MB)
            </div>
          </div>
        )}

        {/* Progress Display */}
        {uploading && (
          <div className="w-full max-w-xs mt-3">
            <div className="flex justify-between text-xs text-muted mb-1">
              <span>Uploading directly to storage...</span>
              <span>{progress > 0 ? `${progress}%` : ''}</span>
            </div>
            <div className="h-1.5 w-full bg-border-light rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent transition-all duration-300 ease-out" 
                style={{ width: `${Math.max(progress, 10)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="text-xs text-danger bg-danger/5 border border-danger/20 rounded-xl px-4 py-2.5 flex items-start gap-2">
          <span className="mt-0.5">⚠️</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
