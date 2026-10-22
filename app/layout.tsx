import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'
import './globals.css'
import GlobeBackground from '@/components/GlobeBackground'
import BottomNav from '@/components/BottomNav'
import BackgroundMusic from '@/components/BackgroundMusic'
import CookieBanner from '@/components/CookieBanner'
import LegalFooter from '@/components/LegalFooter'

export const metadata: Metadata = {
  manifest: '/manifest.webmanifest',
  applicationName: 'MyRoster',
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: { capable: true, title: 'MyRoster', statusBarStyle: 'black-translucent' },
  title: 'MyRoster — Flight planning, simplified',
  description: 'Explore airline networks and routes around the world.',
}
export const viewport: Viewport = { themeColor: '#0a0a0a', colorScheme: 'dark' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="overflow-x-hidden bg-[#0a0a0a] text-white antialiased" suppressHydrationWarning>
        <GlobeBackground />
        <main className="relative z-10 min-h-screen pb-24 lg:ml-[420px] lg:max-w-[700px]">{children}<LegalFooter /></main>
        <BottomNav />
         <BackgroundMusic />
        <CookieBanner />
        <Toaster theme="dark" position="top-center" richColors />
      </body>
    </html>
  )
}
