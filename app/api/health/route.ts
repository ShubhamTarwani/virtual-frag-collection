import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { noCacheHeaders } from '@/lib/cache/headers';

// Helper to execute promises with a timeout fallback
const withTimeout = <T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms)),
  ]);
};

export async function GET() {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  // Create Supabase Client
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Define standard 3s timeout
  const TIMEOUT_MS = 3000;

  // Run all subsystem checks in parallel
  const [supabaseCheck, dbCheck, cloudinaryCheck] = await Promise.allSettled([
    // 1. Supabase Auth Check (Verifies Supabase REST Connection)
    withTimeout(
      (async () => {
        const { error } = await supabase.auth.getSession();
        if (error) throw error;
        return true;
      })(),
      TIMEOUT_MS,
      'Supabase rest connection timed out'
    ),

    // 2. Database Select Check (Verifies database client accessibility)
    withTimeout(
      (async () => {
        const { error } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true });
        if (error) throw error;
        return true;
      })(),
      TIMEOUT_MS,
      'Database query connection timed out'
    ),

    // 3. Cloudinary CDN Connection Check
    withTimeout(
      (async () => {
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        if (!cloudName) {
          throw new Error('Cloudinary cloud name env is not configured');
        }
        // Ping Cloudinary default ping API endpoint to verify connectivity
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/ping`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        });
        if (!res.ok) {
          throw new Error(`Cloudinary responded with status: ${res.status}`);
        }
        const data = await res.json();
        if (data.status !== 'ok') {
          throw new Error('Cloudinary ping status degraded');
        }
        return true;
      })(),
      TIMEOUT_MS,
      'Cloudinary storage connection timed out'
    ),
  ]);

  // Map results
  const services = {
    supabase: {
      ok: supabaseCheck.status === 'fulfilled',
      latencyMs: Date.now() - startTime, // overall timing rough estimate
      error: supabaseCheck.status === 'rejected' ? String(supabaseCheck.reason.message || supabaseCheck.reason) : undefined,
    },
    db: {
      ok: dbCheck.status === 'fulfilled',
      latencyMs: Date.now() - startTime,
      error: dbCheck.status === 'rejected' ? String(dbCheck.reason.message || dbCheck.reason) : undefined,
    },
    cloudinary: {
      ok: cloudinaryCheck.status === 'fulfilled',
      latencyMs: Date.now() - startTime,
      error: cloudinaryCheck.status === 'rejected' ? String(cloudinaryCheck.reason.message || cloudinaryCheck.reason) : undefined,
    },
  };

  const isAllOk = services.supabase.ok && services.db.ok && services.cloudinary.ok;
  const status = isAllOk ? 'ok' : 'degraded';
  
  const payload = {
    status,
    timestamp,
    services,
    version: process.env.VERCEL_GIT_COMMIT_SHA || 'dev',
  };

  const statusCode = isAllOk ? 200 : 503;

  return NextResponse.json(payload, {
    status: statusCode,
    headers: noCacheHeaders() as HeadersInit,
  });
}
