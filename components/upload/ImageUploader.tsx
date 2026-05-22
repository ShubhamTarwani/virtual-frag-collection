"use client"
/* eslint-disable @next/next/no-img-element */

import React, { useState, useRef } from 'react'
import imageCompression from 'browser-image-compression'

interface ImageUploaderProps {
  onUploaded: (url: string, publicId: string) => void;
  folder?: 'avatars' | 'bottles';
  accept?: string;
}

export default function ImageUploader({
  onUploaded,
  folder = 'bottles',
  accept = 'image/*',
}: ImageUploaderProps) {
  const [compressing, setCompressing] = useState(false)
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
    
    // Max pre-compression size check (5MB limit safeguard)
    const maxPreCompressSize = 5 * 1024 * 1024
    if (file.size > maxPreCompressSize) {
      setError('File is too large. Please select an image under 5MB.')
      return
    }

    // Set local preview instantly
    const localUrl = URL.createObjectURL(file)
    setPreviewUrl(localUrl)

    try {
      // 1. Client-side Image Compression
      setCompressing(true)
      const options = {
        maxSizeMB: 0.25,           // 250KB — sweet spot
        maxWidthOrHeight: 1000,    // 1000px is plenty for card display
        useWebWorker: true,
        fileType: 'image/webp',
        initialQuality: 0.85,      // add this — explicit quality control
      }
      
      const compressedBlob = await imageCompression(file, options)
      const compressedFile = new File([compressedBlob], `${file.name.substring(0, file.name.lastIndexOf('.')) || 'image'}.webp`, {
        type: 'image/webp',
      })
      setCompressing(false)

      // 2. Fetch Signed Signature from Route
      setUploading(true)
      setProgress(10)
      const presignResponse = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: compressedFile.name,
          contentType: compressedFile.type,
          folder,
        }),
      })

      if (!presignResponse.ok) {
        const errJson = await presignResponse.json().catch(() => ({}))
        throw new Error(errJson.error || 'Failed to authorize upload')
      }

      const { signature, timestamp, apiKey, cloudName, publicId } = await presignResponse.json()
      setProgress(30)

      // 3. Upload Directly to Cloudinary using XMLHttpRequest to monitor progress
      const formData = new FormData()
      formData.append('file', compressedFile)
      formData.append('api_key', apiKey)
      formData.append('timestamp', timestamp.toString())
      formData.append('signature', signature)
      formData.append('public_id', publicId)
      formData.append('overwrite', 'true')

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
      
      // Fire completion callback
      onUploaded(uploadResult.secure_url, uploadResult.public_id)

    } catch (err: unknown) {
      console.error('Image upload pipeline failure:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred during image upload')
      // Reset preview on failure
      setPreviewUrl(null)
    } finally {
      setCompressing(false)
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
        onClick={(!compressing && !uploading) ? triggerFileInput : undefined}
        className={`relative flex flex-col items-center justify-center border border-dashed rounded-2xl p-6 bg-surface transition-all duration-300 ${
          compressing || uploading 
            ? 'border-accent/40 bg-surface/50 cursor-not-allowed' 
            : 'border-border-light hover:border-accent hover:bg-surface-hover cursor-pointer'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          accept={accept}
          onChange={handleFileChange}
          disabled={compressing || uploading}
          className="hidden"
        />

        {previewUrl ? (
          <div className="relative w-full max-w-[120px] aspect-square rounded-xl overflow-hidden shadow-md mb-2">
            <img 
              src={previewUrl} 
              alt="Preview" 
              className="h-full w-full object-contain p-1"
            />
            {(compressing || uploading) && (
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
              Supports JPEG, PNG, or WebP (max 5MB)
            </div>
          </div>
        )}

        {/* Progress Display */}
        {(compressing || uploading) && (
          <div className="w-full max-w-xs mt-3">
            <div className="flex justify-between text-xs text-muted mb-1">
              <span>{compressing ? 'Compressing image...' : 'Uploading directly to storage...'}</span>
              <span>{progress > 0 ? `${progress}%` : ''}</span>
            </div>
            <div className="h-1.5 w-full bg-border-light rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent transition-all duration-300 ease-out" 
                style={{ width: `${Math.max(progress, compressing ? 45 : 10)}%` }}
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
