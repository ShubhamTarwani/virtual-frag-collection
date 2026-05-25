"use client"
import React from 'react'

type Props = {
  publicId: string
  alt: string
  width: number
  height: number
  className?: string
}

export function BottleImage({ publicId, alt, width = 200, height = 300, className }: Props) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dwk3hglti';
  
  let isFetch = false;
  let finalSrc = publicId || '/placeholder-bottle.png';

  // Handle local placeholder image
  if (finalSrc === '/placeholder-bottle.png') {
    return (
      <img
        src={finalSrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading="lazy"
      />
    )
  }

  // Handle full URLs instead of public IDs
  if (finalSrc.startsWith('http')) {
    // If it's a Cloudinary URL, extract the public ID to process it natively
    const cloudinaryMatch = finalSrc.match(/\/upload\/(?:v\d+\/)?([^.]+)/);
    if (cloudinaryMatch && finalSrc.includes('res.cloudinary.com')) {
      // Decode URI component in case the public ID has spaces encoded as %20
      finalSrc = decodeURIComponent(cloudinaryMatch[1]);
    } else {
      // It's a non-Cloudinary external URL (like Supabase storage). 
      // Use Cloudinary's fetch API to optimize it and remove the background anyway!
      isFetch = true;
    }
  }

  // Build the transformation chain manually:
  // 1. c_limit,w_1000: Downscale the source image to under 10MB first to fit Cloudinary's AI limit
  // 2. e_background_removal: Apply the AI background removal on the resized source
  // 3. a_0: Cache buster to bypass Cloudinary CDN cache
  // 4. c_fill,g_auto,w_<width>,h_<height>: Finally, crop and scale to the layout container dimensions
  // 5. f_png: Output as a transparent PNG
  // 6. q_auto: Automatic quality optimization
  const transformations = `c_limit,w_1000/e_background_removal/a_0/c_fill,g_auto,w_${width},h_${height}/f_png/q_auto`;

  let imageUrl = '';
  if (isFetch) {
    imageUrl = `https://res.cloudinary.com/${cloudName}/image/fetch/${transformations}/${encodeURIComponent(finalSrc)}`;
  } else {
    imageUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${transformations}/v1/${finalSrc}`;
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading="lazy"
    />
  )
}
