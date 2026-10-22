import type { Metadata } from 'next'
import { LegalPage } from '@/components/LegalPage'
import { LEGAL } from '@/lib/legal'

export const metadata: Metadata = { title: 'Terms & Conditions · MyRoster' }

export default function TermsPage() {
  return (
    <LegalPage title="Terms & Conditions">
      <p>By using {LEGAL.site} you agree to these terms. If you do not agree, please do not use the site.</p>

      <h2>1. What {LEGAL.site} is</h2>
      <p>{LEGAL.site} is a tool for exploring airline route networks and planning, timing and logging <strong>simulated</strong> flights. It is for entertainment and flight simulation only.</p>

      <h2>2. Not for real-world use</h2>
      <p>Routes, schedules, aircraft, distances and times are approximate and may be out of date (route data comes from a 2014 dataset). <strong>Never use {LEGAL.site} for real navigation, flight planning, operations or travel decisions.</strong> Check official sources for real flights.</p>

      <h2>3. No affiliation</h2>
      <p>{LEGAL.site} is an independent project. It is not affiliated with, endorsed by or sponsored by any airline, airport, aircraft manufacturer, SimBrief, FlightAware or Microsoft Flight Simulator. All names and logos belong to their owners and are shown only to identify them.</p>

      <h2>4. Your account</h2>
      <p>You must be at least 16. Give a valid email, keep your password secret and tell us if you suspect misuse. You are responsible for activity under your account.</p>

      <h2>5. Acceptable use</h2>
      <ul>
        <li>Do not attack, overload, scrape at scale or try to bypass the security of the site.</li>
        <li>Do not use the site for anything unlawful or to harm others.</li>
        <li>Do not access other users' data.</li>
      </ul>

      <h2>6. Your content</h2>
      <p>You keep ownership of the flights, notes and routes you save. You give us permission to store and display them to you in order to run the service. We do not publish them to others.</p>

      <h2>7. Third-party services and links</h2>
      <p>The site relies on third parties (for example hosting, database, logo and map data) and links to external sites such as SimBrief and FlightAware. We do not control them and are not responsible for their content or availability.</p>

      <h2>8. Intellectual property</h2>
      <p>The {LEGAL.site} name, logo, design and code belong to {LEGAL.owner}, except for third-party material noted in the <a href="/legal-notice">Legal Notice</a>. You may not copy or reuse them without permission.</p>

      <h2>9. Availability and changes</h2>
      <p>The service is provided free of charge and "as is". We may change, suspend or stop any feature at any time, and data could occasionally be lost, so keep your own backup of anything important.</p>

      <h2>10. Liability</h2>
      <p>To the extent permitted by law, we are not liable for indirect or consequential loss, or for loss caused by inaccurate data or by using the site against these terms. Nothing here limits liability that cannot be limited by law.</p>

      <h2>11. Ending your use</h2>
      <p>You can stop using the site and ask us to delete your account at any time. We may suspend accounts that break these terms.</p>

      <h2>12. Law</h2>
      <p>These terms are governed by the laws of {LEGAL.country}, without affecting any mandatory consumer rights you have where you live.</p>

      <h2>13. Changes and contact</h2>
      <p>We may update these terms; the date above shows the latest version. Questions: <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.</p>
    </LegalPage>
  )
}
