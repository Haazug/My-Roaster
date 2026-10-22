import type { Metadata } from 'next'
import { LegalPage } from '@/components/LegalPage'
import { CookieSettingsButton } from '@/components/CookieBanner'
import { LEGAL } from '@/lib/legal'

export const metadata: Metadata = { title: 'Cookie Policy · MyRoster' }

export default function CookiesPage() {
  return (
    <LegalPage title="Cookie Policy">
      <p>{LEGAL.site} mainly uses your browser's local storage rather than traditional cookies. The same rules apply, so this policy covers both.</p>

      <h2>Essential (always on)</h2>
      <p>Needed for the service you ask for. They do not require consent.</p>
      <ul>
        <li><strong>Login session</strong> (set by our authentication provider): keeps you signed in.</li>
        <li><strong>myroster.consent</strong>: remembers your cookie choice.</li>
        <li><strong>myroster.logs, myroster.favourites, myroster.bookings, myroster.customRoutes</strong>: your saved flights, favourites, trips and routes. If you are signed in they are also saved to your account.</li>
        <li><strong>myroster.activePlan, myroster.routeSeed, myroster.synced.*</strong>: temporary data that carries your flight plan between pages and tracks syncing.</li>
      </ul>

      <h2>Preferences (only with your consent)</h2>
      <ul>
        <li><strong>myroster.music.volume, myroster.music.muted</strong>: remember your music settings.</li>
      </ul>

      <h2>What we do not use</h2>
      <p>No advertising, tracking or analytics cookies. If that changes, we will ask for your consent first.</p>

      <h2>Third parties</h2>
      <p>Loading logos, globe images and live traffic data contacts third-party servers, which see your IP address and may handle their own technical data. See the <a href="/privacy">Privacy Policy</a>.</p>

      <h2>Your choices</h2>
      <p>You can change your choice at any time:</p>
      <p><CookieSettingsButton className="rounded-xl bg-[#1f88ff] px-4 py-2 text-sm font-semibold text-white no-underline" /></p>
      <p>You can also clear stored data in your browser settings. Doing so signs you out and removes flights that are not saved to an account.</p>
    </LegalPage>
  )
}
