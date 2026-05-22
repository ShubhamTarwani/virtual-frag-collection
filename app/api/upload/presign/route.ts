import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import cloudinary from '@/lib/cloudinary';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    // Removed admin restriction to allow all authenticated users to upload photos
    // if (!adminEmail || user.email !== adminEmail) {
    //   return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    // }

    const uploadLimit = await checkRateLimit({
      endpoint: 'upload:hourly',
      identifier: user.id,
      maxRequests: 50,
      windowMinutes: 60
    });

    if (!uploadLimit.allowed) {
      return rateLimitResponse(uploadLimit);
    }

    const timestamp = Math.round(Date.now() / 1000);
    const folder = 'perfumes';

    const paramsToSign = {
      timestamp,
      folder,
    };

    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!apiSecret) {
      return NextResponse.json({ error: 'Cloudinary API secret is not configured' }, { status: 500 });
    }

    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

    return NextResponse.json({
      signature,
      timestamp,
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder,
    });

  } catch (err: unknown) {
    console.error('Presign route error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
