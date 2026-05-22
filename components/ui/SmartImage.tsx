/* eslint-disable @next/next/no-img-element */
import React from 'react'
import { cdnImage } from '@/lib/image/cdn'

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}

export default function SmartImage({
  src,
  alt,
  width,
  height,
  sizes = '100vw',
  priority = false,
  className,
  ...rest
}: SmartImageProps) {
  // If it's a Cloudinary URL, we can generate a smart responsive srcSet
  const isCloudinary = src && src.includes('res.cloudinary.com');

  if (!isCloudinary) {
    // Non-cloudinary images (placeholders, externally loaded logos, Google profile pictures)
    return (
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? undefined : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        className={className}
        {...rest}
      />
    );
  }

  // Generate responsive widths for the srcSet
  const widths = [320, 640, 960, 1280];
  const srcSet = widths
    .map((w) => `${cdnImage(src, { width: w })} ${w}w`)
    .join(', ');

  // Get the default size image URL (using width if specified, or a reasonable default size)
  const defaultWidth = typeof width === 'number' ? width : 640;
  const defaultSrc = cdnImage(src, { width: defaultWidth });

  return (
    <img
      src={defaultSrc}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? undefined : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      className={className}
      {...rest}
    />
  );
}
