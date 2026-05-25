import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import CustomCursor from "@/components/ui/CustomCursor";
import ThemeSwitcher from "./components/ThemeSwitcher";
import { Analytics } from '@vercel/analytics/next';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: '%s | Virtual Fragrance Shelf',
    default: 'Virtual Fragrance Shelf — Community',
  },
  description: "A premium social platform for fragrance collectors. Browse, share, and discover perfume collections with AI wardrobe assistance.",
  metadataBase: new URL('https://personal-perfume.vercel.app'),
  openGraph: {
    title: 'Virtual Fragrance Shelf',
    description: "A premium social platform for fragrance collectors. Browse, share, and discover perfume collections.",
    url: 'https://personal-perfume.vercel.app',
    siteName: 'Virtual Fragrance Shelf',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Virtual Fragrance Shelf',
    description: "A premium social platform for fragrance collectors. Browse, share, and discover perfume collections.",
  },
  robots: {
    index: true,
    follow: true,
  }
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <CustomCursor />
        <ThemeSwitcher />
        <NavBar />
        {children}
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}

