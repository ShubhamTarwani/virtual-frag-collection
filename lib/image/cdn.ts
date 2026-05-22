export interface CdnImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'auto' | 'webp' | 'avif';
  fit?: 'cover' | 'contain' | 'limit' | 'fill';
}

/**
 * Builds a transformed Cloudinary URL on-the-fly.
 * Bypasses local next/image optimization entirely.
 */
export function cdnImage(url: string, opts: CdnImageOptions = {}): string {
  if (!url) return '';

  // Verify if it's a Cloudinary URL
  const isCloudinary = url.includes('res.cloudinary.com');

  if (!isCloudinary) {
    // External images (Google login avatar, locally hosted placeholders etc) return unchanged
    return url;
  }

  // Construct Cloudinary transformation string
  const parts: string[] = [];
  
  if (opts.width) parts.push(`w_${opts.width}`);
  if (opts.height) parts.push(`h_${opts.height}`);
  
  const quality = opts.quality ?? 75;
  parts.push(`q_${quality}`);
  
  const format = opts.format ?? 'auto';
  parts.push(`f_${format}`);

  if (opts.fit) {
    // Map standard S3 crop names to Cloudinary
    const fitMap: Record<string, string> = {
      cover: 'fill',
      contain: 'fit',
      limit: 'limit',
      fill: 'scale',
    };
    parts.push(`c_${fitMap[opts.fit] || opts.fit}`);
  } else if (opts.width || opts.height) {
    // Default to limit scale to preserve aspect ratio if dimensions specified without crop
    parts.push('c_limit');
  }

  const transformationStr = parts.join(',');

  // Injection logic: Cloudinary URL structure:
  // https://res.cloudinary.com/<cloud_name>/image/upload/[options]/v12345/folder/name.jpg
  // We need to inject our transformations right after /upload/
  const uploadToken = '/image/upload';
  const uploadIndex = url.indexOf(uploadToken);

  if (uploadIndex === -1) {
    return url; // fallback
  }

  const prefix = url.substring(0, uploadIndex + uploadToken.length);
  const suffix = url.substring(uploadIndex + uploadToken.length);

  return `${prefix}/${transformationStr}${suffix}`;
}

/**
 * Next.js custom loader compatible function
 */
export default function cloudinaryLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  return cdnImage(src, { width, quality });
}
