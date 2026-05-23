import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="w-full bg-[#0d0b08] border-t border-[rgba(200,170,100,0.1)] py-8 mt-auto font-sans">
      <div className="max-w-7xl mx-auto px-6 flex flex-col items-center">
        {/* Top Section - 3 Columns */}
        <div className="w-full flex flex-col md:flex-row justify-between items-center text-center md:text-left gap-8 mb-8">
          
          {/* Left Column */}
          <div className="flex flex-col items-center md:items-start">
            <span className="text-sm font-semibold text-foreground tracking-wide font-serif">Fragrance Shelf</span>
            <span className="text-xs text-muted mt-1">The community for collectors</span>
          </div>

          {/* Center Column */}
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 text-xs text-muted">
            <Link href="/discover" className="hover:text-[rgba(200,170,100,0.8)] transition-colors">Discover</Link>
            <Link href="/feed" className="hover:text-[rgba(200,170,100,0.8)] transition-colors">Feed</Link>
            <Link href="/wardrobe" className="hover:text-[rgba(200,170,100,0.8)] transition-colors">Wardrobe</Link>
          </div>

          {/* Right Column */}
          <div className="text-xs text-muted flex items-center">
            Crafted by&nbsp;
            <a 
              href="https://github.com/shubhamtarwani" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#c8a855] hover:text-[#e0c47b] transition-colors font-medium"
            >
              Shubham Tarwani
            </a>
          </div>

        </div>

        {/* Bottom Line */}
        <div className="w-full border-t border-[rgba(200,170,100,0.05)] pt-6 text-center">
          <p className="text-[10px] text-muted/60">
            © 2026 Fragrance Shelf. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
