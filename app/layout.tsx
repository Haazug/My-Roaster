import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'
import './globals.css'
import GlobeBackground from '@/components/GlobeBackground'
import BottomNav from '@/components/BottomNav'

export const metadata: Metadata = {
  title: 'MyRoster — Flight planning, simplified',
  description: 'Explore airline networks and routes around the world.',
}
export const viewport: Viewport = { themeColor: '#0a0a0a', colorScheme: 'dark' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="overflow-x-hidden bg-[#0a0a0a] text-white antialiased" suppressHydrationWarning>
        <GlobeBackground />
        <main className="relative z-10 min-h-screen pb-24 lg:ml-[420px] lg:max-w-[700px]">{children}</main>
        <BottomNav />
        <Toaster theme="dark" position="top-center" richColors />
      </body>
    </html>
  )
}
