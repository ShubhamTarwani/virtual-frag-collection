import React from 'react';
import { headers } from 'next/headers';
import Link from 'next/link';

interface ServiceStatus {
  ok: boolean;
  latencyMs: number;
  error?: string;
}

interface HealthPayload {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  services: {
    supabase: ServiceStatus;
    db: ServiceStatus;
    cloudinary: ServiceStatus;
  };
  version: string;
}

export default async function HealthDashboardPage(props: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await props.searchParams;
  const configuredToken = process.env.ADMIN_HEALTH_TOKEN;

  // Gate check
  if (!configuredToken || token !== configuredToken) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-surface border border-danger/30 rounded-3xl p-8 shadow-sm">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-danger font-serif mb-2">Access Denied</h1>
          <p className="text-sm text-muted mb-6">
            A valid token is required to view the health monitoring dashboard. Please configure ADMIN_HEALTH_TOKEN in your environment.
          </p>
          <Link
            href="/"
            className="inline-block rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-background hover:opacity-90 transition-opacity"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Fetch health payload from our local API route (absolute URL check using Host headers)
  let healthData: HealthPayload | null = null;
  let fetchError: string | null = null;

  try {
    const headersList = await headers();
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = host.startsWith('localhost') ? 'http' : 'https';
    
    const res = await fetch(`${protocol}://${host}/api/health`, {
      cache: 'no-store',
    });
    
    healthData = await res.json();
  } catch (err) {
    console.error('Failed to fetch health status:', err);
    fetchError = err instanceof Error ? err.message : String(err);
  }

  const overallStatus = healthData?.status || 'down';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <div className="mx-auto max-w-2xl w-full px-6 py-12 flex-1 flex flex-col justify-center">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-accent to-transparent" />
            <span className="text-xs font-semibold tracking-[0.3em] uppercase text-accent">Operations</span>
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-accent to-transparent" />
          </div>
          <h1 className="text-3xl font-bold text-foreground font-serif">Infrastructure Health</h1>
          <p className="text-sm text-muted mt-2">Real-time status check of active fragrance shelf backends</p>
        </div>

        {fetchError ? (
          <div className="rounded-3xl border border-danger/30 bg-surface p-8 text-center shadow-sm">
            <div className="text-3xl mb-3">⚠️</div>
            <h2 className="text-lg font-bold text-danger">Monitoring Link Failure</h2>
            <p className="text-sm text-muted mt-2">{fetchError}</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Status Panel Card */}
            <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs text-muted uppercase tracking-wider">Overall Shelf Health</div>
                <div className="text-xl font-bold text-foreground font-serif mt-1">
                  {overallStatus === 'ok' ? 'All Systems Operational' : 'Degraded System Performance'}
                </div>
                <div className="text-[10px] text-muted mt-2">
                  Last updated: {healthData ? new Date(healthData.timestamp).toLocaleString() : 'N/A'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`relative flex h-4 w-4`}>
                  {overallStatus === 'ok' ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
                    </>
                  ) : (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-yellow-500"></span>
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Individual Subsystems */}
            {healthData && (
              <div className="grid gap-4">
                {/* Supabase REST API check */}
                <div className="rounded-2xl border border-border bg-surface/50 p-5 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                      Supabase REST Client
                      <span className={`h-2 w-2 rounded-full ${healthData.services.supabase.ok ? 'bg-green-500' : 'bg-red-500'}`} />
                    </div>
                    {healthData.services.supabase.error && (
                      <p className="text-xs text-danger mt-1 truncate">{healthData.services.supabase.error}</p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-xs text-muted uppercase">Latency</div>
                    <div className="text-sm font-bold text-foreground">{healthData.services.supabase.latencyMs}ms</div>
                  </div>
                </div>

                {/* Database Direct SELECT query check */}
                <div className="rounded-2xl border border-border bg-surface/50 p-5 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                      Database Connection (Profiles Query)
                      <span className={`h-2 w-2 rounded-full ${healthData.services.db.ok ? 'bg-green-500' : 'bg-red-500'}`} />
                    </div>
                    {healthData.services.db.error && (
                      <p className="text-xs text-danger mt-1 truncate">{healthData.services.db.error}</p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-xs text-muted uppercase">Latency</div>
                    <div className="text-sm font-bold text-foreground">{healthData.services.db.latencyMs}ms</div>
                  </div>
                </div>

                {/* Cloudinary connection/ping API check */}
                <div className="rounded-2xl border border-border bg-surface/50 p-5 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                      Cloudinary Storage API
                      <span className={`h-2 w-2 rounded-full ${healthData.services.cloudinary.ok ? 'bg-green-500' : 'bg-red-500'}`} />
                    </div>
                    {healthData.services.cloudinary.error && (
                      <p className="text-xs text-danger mt-1 truncate">{healthData.services.cloudinary.error}</p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-xs text-muted uppercase">Latency</div>
                    <div className="text-sm font-bold text-foreground">{healthData.services.cloudinary.latencyMs}ms</div>
                  </div>
                </div>
              </div>
            )}

            {/* Auto-Refresh Indicator */}
            <div className="text-center text-[10px] text-muted">
              Auto-refresh trigger: Append `?token=YOUR_TOKEN` to see this page. Refreshing is handled via routing refresh.
            </div>

          </div>
        )}
      </div>
      
      {/* Footer */}
      <footer className="py-6 border-t border-border/50 text-center text-xs text-muted">
        Virtual Fragrance Shelf Operations • App Version: {healthData?.version || 'dev'}
      </footer>
    </div>
  );
}
