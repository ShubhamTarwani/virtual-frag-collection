import React from 'react'
import { BottleImage } from './BottleImage'

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
  className,
}: SmartImageProps) {
  // Convert standard HTML props to BottleImage props
  const w = typeof width === 'number' ? width : parseInt(String(width || '640'), 10)
  const h = typeof height === 'number' ? height : parseInt(String(height || '640'), 10)
  
  return (
    <BottleImage
      publicId={src}
      alt={alt}
      width={w}
      height={h}
      className={className}
    />
  );
}
