import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { v2 as cloudinary } from 'cloudinary';
import { nanoid } from 'nanoid';

// Configure cloudinary on the server-side route
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function POST(req: Request) {
  try {
    // 1. Auth-gate: check active Supabase user session
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await req.json().catch(() => ({}));
    const { filename, contentType, folder = 'bottles' } = body;

    if (!filename || !contentType) {
      return NextResponse.json({ error: 'Filename and contentType are required' }, { status: 400 });
    }

    // 3. Validation: file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json({ error: 'Invalid content type. Only JPEG, PNG, and WebP are allowed' }, { status: 400 });
    }

    // Validation: filename length and safety (prevent path traversal)
    if (filename.length > 100 || filename.includes('..') || /[/\\]/.test(filename)) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    // 4. Generate Cloudinary Upload configurations
    const timestamp = Math.round(new Date().getTime() / 1000);
    
    // Sanitize filename to alphanumeric/underscores
    const cleanFilename = filename
      .substring(0, filename.lastIndexOf('.'))
      .replace(/[^a-zA-Z0-9_-]/g, '_');

    // Cloudinary target public ID
    // Path structure: scentboxd/{folder}/{userId}/{12-char-nanoid}_{cleanFilename}
    const fileId = nanoid(12);
    const publicId = `scentboxd/${folder}/${user.id}/${fileId}_${cleanFilename}`;

    // Cloudinary parameters that MUST be signed
    const paramsToSign = {
      timestamp,
      public_id: publicId,
      overwrite: true,
    };

    // 5. Generate signature using Cloudinary SDK utility
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!apiSecret) {
      return NextResponse.json({ error: 'Cloudinary API secret is not configured' }, { status: 500 });
    }

    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

    // 6. Return coordinates
    return NextResponse.json({
      signature,
      timestamp,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      publicId,
    });

  } catch (err: unknown) {
    console.error('Presign route error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
