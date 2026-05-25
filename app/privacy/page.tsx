import React from 'react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background py-16 px-6">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-accent to-transparent" />
            <span className="text-xs font-semibold tracking-[0.3em] uppercase text-accent">Legal</span>
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-accent to-transparent" />
          </div>
          <h1 className="text-4xl font-bold text-foreground font-serif">Privacy Policy</h1>
          <p className="text-sm text-muted mt-2">Effective Date: May 25, 2026</p>
        </div>

        <div className="prose prose-invert max-w-none space-y-6 text-sm text-muted leading-relaxed">
          <p>
            At Fragrance Shelf, we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your personal and collection data when you use our website.
          </p>

          <section className="bg-surface/30 border border-border/80 p-6 rounded-2xl space-y-3">
            <h2 className="text-base font-semibold text-foreground font-serif">1. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Account Credentials:</strong> When you register, we collect your email address, username, and password. This is handled securely via Supabase Auth.
              </li>
              <li>
                <strong>Profile & Collection Data:</strong> We store your chosen display name, bio, profile avatar, the names/brands of the fragrances you add, your custom ratings, and wear logs.
              </li>
              <li>
                <strong>Media Uploads:</strong> When you upload bottle photos, they are stored securely on Cloudinary.
              </li>
              <li>
                <strong>Location Data:</strong> To provide local weather-based fragrance recommendations, the application requests access to your approximate geolocation (latitude and longitude). This coordinates lookup is processed in memory on your client browser and is never stored permanently on our databases.
              </li>
            </ul>
          </section>

          <section className="bg-surface/30 border border-border/80 p-6 rounded-2xl space-y-3">
            <h2 className="text-base font-semibold text-foreground font-serif">2. Third-Party Integrations</h2>
            <p>
              We integrate with trusted third-party providers to deliver our core features:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Supabase:</strong> For cloud hosting of our databases and secure user authentication.
              </li>
              <li>
                <strong>Cloudinary:</strong> For hosting your uploaded bottle photos and applying automated AI background removal.
              </li>
              <li>
                <strong>Google Gemini API:</strong> When you request information auto-fill for a fragrance, we send the fragrance brand and name to Google's Gemini API to retrieve structured olfactory notes and categories. No personally identifiable user information is sent to Gemini.
              </li>
            </ul>
          </section>

          <section className="bg-surface/30 border border-border/80 p-6 rounded-2xl space-y-3">
            <h2 className="text-base font-semibold text-foreground font-serif">3. Security</h2>
            <p>
              We enforce SSL encryption across our entire application. Database tables are protected by Row-Level Security (RLS) policies to prevent unauthorized access or tampering of your private collection data.
            </p>
          </section>

          <section className="bg-surface/30 border border-border/80 p-6 rounded-2xl space-y-3">
            <h2 className="text-base font-semibold text-foreground font-serif">4. Contact Us</h2>
            <p>
              If you have any questions or concerns about how we handle your data, please contact us at:
              <br />
              <a href="mailto:shubham@perfs.com" className="text-accent hover:underline mt-1 inline-block">
                shubham@perfs.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
