"use client"
import React from 'react'
import { CldImage } from 'next-cloudinary'

type Props = {
  publicId: string
  alt: string
  width: number
  height: number
  className?: string
}

export function BottleImage({ publicId, alt, width, height, className }: Props) {
  // Fallback for old legacy Supabase URLs (must render as plain <img>)
  if (publicId?.startsWith('http://') || publicId?.startsWith('https://')) {
    return (
      <img
        src={publicId}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading="lazy"
      />
    )
  }

  // Cloudinary managed image
  return (
    <CldImage
      src={publicId}
      alt={alt}
      width={width}
      height={height}
      crop="fill"
      gravity="auto"
      format="png"        // Force PNG to preserve transparency through Next.js proxy
      quality="auto"      // Cloudinary picks best quality
      removeBackground={true} // Add on-the-fly background removal
      className={className}
    />
  )
}
