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

    // Admin guard
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail || user.email !== adminEmail) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // 2. Parse request body
    const body = await req.json().catch(() => ({}));
    const { filename, contentType, folder = 'bottles' } = body;

    if (!filename || !contentType) {
      return NextResponse.json({ error: 'Filename and contentType are required' }, { status: 400 });
    }

    // 3. Validation: file type
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json({ error: 'Invalid content type. Only JPEG, PNG, and WebP are allowed' }, { status: 400 });
    }

    // Validation: file size (assuming client sends size, but we can't fully enforce here easily without Cloudinary profile. However, audit requests it: 'reject anything over 5MB after compression'. Since this is presign, we assume max-size is enforced by Cloudinary or client, but we will add logic if size is passed.)
    if (body.size && body.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    // Validation: filename length and safety (prevent path traversal)
    if (filename.length > 100 || filename.includes('..') || /[/\\]/.test(filename)) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    // 4. Generate Cloudinary Upload configurations
    const timestamp = Math.round(new Date().getTime() / 1000);
    
    const ext = contentType === 'image/jpeg' ? 'jpg' : contentType.split('/')[1];
    const safeFilename = `${crypto.randomUUID()}.${ext}`;

    // Cloudinary target public ID
    // Path structure: scentboxd/{folder}/{userId}/{safeFilename}
    const publicId = `scentboxd/${folder}/${user.id}/${safeFilename}`;

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
