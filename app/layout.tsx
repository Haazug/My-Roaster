import GlobeDiscovery from '@/components/GlobeDiscovery'
import NavigationHistory from '@/components/NavigationHistory'
import GlobeInteraction from '@/components/GlobeInteraction'
import AppContent from '@/components/AppContent'
import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'
import './globals.css'
import FlightCompanion from '@/components/FlightCompanion'
import GlobeBackground from '@/components/GlobeBackground'
import BottomNav from '@/components/BottomNav'
import BackgroundMusic from '@/components/BackgroundMusic'
import CookieBanner from '@/components/CookieBanner'
import PlnDrop from '@/components/PlnDrop'
import JingleOnClick from '@/components/JingleOnClick'
import ExternalOpen from '@/components/ExternalOpen'
import LanguageGate from '@/components/LanguageGate'
import LegalFooter from '@/components/LegalFooter'
import LogoCorner from '@/components/LogoCorner'

export const metadata: Metadata = {
  manifest: '/manifest.webmanifest',
  applicationName: 'MyRoster',
  icons: {
    icon: [
      { url: '/favicon-32.png?v=2.2.0', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png?v=2.2.0', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/favicon.ico?v=2.2.0',
    apple: [{ url: '/apple-icon.png?v=2.2.0', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: { capable: true, title: 'MyRoster', statusBarStyle: 'black-translucent' },
  title: 'MyRoster — Flight planning, simplified',
  description: 'Explore airline networks and routes around the world.',
}
export const viewport: Viewport = { themeColor: '#0a0a0a', colorScheme: 'dark', width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="overflow-x-hidden bg-[#0a0a0a] text-white antialiased" suppressHydrationWarning>
        <GlobeBackground />
        <LogoCorner />
        <AppContent>{children}<LegalFooter /></AppContent>
        <NavigationHistory />
        <GlobeInteraction />
        <GlobeDiscovery />
        <BottomNav />
        <FlightCompanion />
         <BackgroundMusic />
        <LanguageGate />
        <PlnDrop />
        <JingleOnClick />
        <ExternalOpen />
        <CookieBanner />
        <Toaster theme="dark" position="top-center" richColors />
      </body>
    </html>
  )
}
