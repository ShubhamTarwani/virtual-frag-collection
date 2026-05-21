import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-background px-6 py-24 text-center">
      <div className="max-w-md w-full flex flex-col items-center">
        {/* Decorative gold elements */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-accent to-transparent" />
          <p className="text-xs font-semibold tracking-[0.3em] uppercase text-accent">
            Lost Scent
          </p>
          <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-accent to-transparent" />
        </div>

        {/* 404 Number */}
        <h1 className="text-8xl font-bold tracking-tight text-accent font-serif mb-4">
          404
        </h1>

        {/* Title */}
        <h2 className="text-2xl font-bold text-foreground mb-4 font-serif">
          Fragrance Not Found
        </h2>

        {/* Description */}
        <p className="text-sm text-muted mb-8 max-w-sm leading-relaxed">
          The bottle you are looking for has been moved, finished, or is temporarily out of reach. Let's return to the collection.
        </p>

        {/* Action Button */}
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full border border-accent bg-accent/10 px-6 py-2.5 text-sm font-medium text-accent hover:bg-accent/20 hover:text-accent-light transition-all duration-300 shadow-[0_0_15px_rgba(212,165,116,0.1)]"
        >
          Return to Shelf
        </Link>
      </div>
    </div>
  )
}
