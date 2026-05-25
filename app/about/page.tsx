import React from 'react'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background py-16 px-6">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-accent to-transparent" />
            <span className="text-xs font-semibold tracking-[0.3em] uppercase text-accent">Our Story</span>
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-accent to-transparent" />
          </div>
          <h1 className="text-4xl font-bold text-foreground font-serif">About Fragrance Shelf</h1>
          <p className="text-sm text-muted mt-2">The premier catalog and social space for perfume collectors.</p>
        </div>

        <div className="prose prose-invert max-w-none space-y-8 text-sm text-muted leading-relaxed">
          <section className="bg-surface/50 border border-border p-6 rounded-2xl">
            <h2 className="text-lg font-semibold text-foreground font-serif mb-3">The Vision</h2>
            <p>
              Fragrance Shelf was conceived as a digital sanctuary for fragrance enthusiasts. 
              Unlike standard spreadsheets or generic inventory apps, we believe a perfume collection is a form of personal art. 
              Our platform offers a premium, editorial-style 3D shelf experience that respects the craftsmanship of fine perfumery.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground font-serif">Key Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-surface/30 border border-border/60 p-5 rounded-2xl">
                <h3 className="font-semibold text-foreground mb-1.5">3D Interactive Shelf</h3>
                <p className="text-xs">Visualize your physical bottles on premium virtual shelves segmented by perfume genres and concentration tiers.</p>
              </div>
              <div className="bg-surface/30 border border-border/60 p-5 rounded-2xl">
                <h3 className="font-semibold text-foreground mb-1.5">AI Wardrobe Assistant</h3>
                <p className="text-xs">Powered by Google Gemini and local weather data, our smart scoring system recommends the perfect scent for any occasion, mood, or temperature.</p>
              </div>
              <div className="bg-surface/30 border border-border/60 p-5 rounded-2xl">
                <h3 className="font-semibold text-foreground mb-1.5">Community & Feed</h3>
                <p className="text-xs">Follow other collectors, share daily wear logs, and discover trending scents globally in a clean, ad-free ecosystem.</p>
              </div>
              <div className="bg-surface/30 border border-border/60 p-5 rounded-2xl">
                <h3 className="font-semibold text-foreground mb-1.5">Background Removal</h3>
                <p className="text-xs">Upload raw bottle pictures directly from your mobile phone; our automated Cloudinary AI processor strips backgrounds instantly for a neat display.</p>
              </div>
            </div>
          </section>

          <section className="bg-surface/50 border border-border p-6 rounded-2xl text-center">
            <h2 className="text-lg font-semibold text-foreground font-serif mb-3">Join the Club</h2>
            <p className="mb-4">
              Create an account, catalog your signature scents, log your daily wears, and connect with like-minded collectors today.
            </p>
            <a 
              href="/signup" 
              className="inline-block rounded-full bg-accent px-6 py-2 text-xs font-semibold text-background transition hover:opacity-90"
            >
              Get Started
            </a>
          </section>
        </div>
      </div>
    </div>
  )
}
