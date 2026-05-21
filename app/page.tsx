"use client"

import Image from "next/image"
import PerfumeShelf from "./components/PerfumeShelf"

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black p-8">
      <main className="w-full max-w-4xl">
        <div className="mb-6 flex items-center gap-4">
          <Image src="/next.svg" alt="Next.js" width={80} height={18} />
          <h1 className="text-2xl font-semibold">Virtual Fragrance Shelf</h1>
        </div>

        <PerfumeShelf />
      </main>
    </div>
  )
}
