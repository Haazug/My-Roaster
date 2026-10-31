import {LEGAL} from '@/lib/legal'
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL||`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL||process.env.VERCEL_URL||LEGAL.url}`),
  manifest: '/manifest.webmanifest',
  applicationName: 'MyRoster',
  openGraph: {title:'MyRoster',description:'Explore airline networks and plan your next flight.',images:[{url:'/icon-512.png?v=2.2.2',width:512,height:512,alt:'MyRoster'}]},
  twitter: {card:'summary',title:'MyRoster',images:['/icon-512.png?v=2.2.2']},
  icons: {
    icon: [
      { url: '/favicon-32.png?v=2.2.2', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png?v=2.2.2', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/favicon.ico?v=2.2.2',
    apple: [{ url: '/apple-icon.png?v=2.2.2', sizes: '180x180', type: 'image/png' }],
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
