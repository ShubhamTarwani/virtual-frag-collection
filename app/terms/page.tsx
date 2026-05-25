import React from 'react'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background py-16 px-6">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-accent to-transparent" />
            <span className="text-xs font-semibold tracking-[0.3em] uppercase text-accent">Legal</span>
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-accent to-transparent" />
          </div>
          <h1 className="text-4xl font-bold text-foreground font-serif">Terms of Service</h1>
          <p className="text-sm text-muted mt-2">Last Updated: May 25, 2026</p>
        </div>

        <div className="prose prose-invert max-w-none space-y-6 text-sm text-muted leading-relaxed">
          <p>
            Welcome to Fragrance Shelf. By using our website and services, you agree to comply with and be bound by the following Terms of Service. Please read them carefully.
          </p>

          <section className="bg-surface/30 border border-border/80 p-6 rounded-2xl space-y-3">
            <h2 className="text-base font-semibold text-foreground font-serif">1. Acceptable Use</h2>
            <p>
              Fragrance Shelf is a cataloging and social platform intended for personal use by fragrance collectors. 
              You agree not to use the service to upload malicious content, scrape data, or abuse the free AI features (such as Gemini auto-fill or weather-based wardrobe recommendations). 
              Any system-wide abuse or spamming of APIs will result in immediate account suspension.
            </p>
          </section>

          <section className="bg-surface/30 border border-border/80 p-6 rounded-2xl space-y-3">
            <h2 className="text-base font-semibold text-foreground font-serif">2. User Accounts</h2>
            <p>
              To access certain features, you must create a user account. You are responsible for safeguarding your credentials. 
              We reserve the right to suspend or terminate accounts that violate our community standards, impersonate others, or generate spam profiles.
            </p>
          </section>

          <section className="bg-surface/30 border border-border/80 p-6 rounded-2xl space-y-3">
            <h2 className="text-base font-semibold text-foreground font-serif">3. Content Ownership & Uploads</h2>
            <p>
              You retain ownership of any images, reviews, and collection notes you upload to the platform. 
              By uploading media to Fragrance Shelf (stored via Cloudinary), you grant us a worldwide, non-exclusive license to display, host, and crop/resize the images for the purpose of presenting them on your virtual shelf and community feeds.
            </p>
          </section>

          <section className="bg-surface/30 border border-border/80 p-6 rounded-2xl space-y-3">
            <h2 className="text-base font-semibold text-foreground font-serif">4. Service Modifications & Limitations</h2>
            <p>
              Fragrance Shelf is provided "as is" and "as available". We do not guarantee continuous, uninterrupted uptime. 
              We reserve the right to modify, restrict, or discontinue services (or specific AI features) at any time to prevent abuse or manage infrastructure costs.
            </p>
          </section>

          <section className="bg-surface/30 border border-border/80 p-6 rounded-2xl space-y-3">
            <h2 className="text-base font-semibold text-foreground font-serif">5. Changes to Terms</h2>
            <p>
              We may update these terms from time to time. If we make material modifications, we will update the "Last Updated" date at the top of this page. Your continued use of the platform after changes are posted constitutes your acceptance of the updated terms.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
