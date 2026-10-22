import type { Metadata } from 'next'
import { LegalPage } from '@/components/LegalPage'
import { LEGAL } from '@/lib/legal'

export const metadata: Metadata = { title: 'Privacy Policy · MyRoster' }

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>This policy explains what personal data {LEGAL.site} collects, why, and what rights you have. We keep it as small as we can.</p>

      <h2>1. Who is responsible</h2>
      <p>{LEGAL.owner}, {LEGAL.address}. Contact: <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.</p>

      <h2>2. What we collect</h2>
      <ul>
        <li><strong>Account data:</strong> your email address and a password. Passwords are handled by our authentication provider and stored hashed; we cannot read them.</li>
        <li><strong>Your content:</strong> flights you log, ratings, favourites, booked trips, custom routes and flight plans you create.</li>
        <li><strong>Technical data:</strong> IP address, browser and device information and timestamps, created by our hosting provider and by the third-party services your browser loads (see section 5).</li>
        <li><strong>Data stored in your browser:</strong> see our <a href="/cookies">Cookie Policy</a>.</li>
      </ul>
      <p>We do not use advertising or analytics trackers, we do not build advertising profiles and we do not sell your data.</p>

      <h2>3. Why we use it</h2>
      <ul>
        <li>To create and secure your account and to provide the features you ask for, including saving your flights across devices (performance of the service you requested).</li>
        <li>To keep the site secure and working, and to prevent abuse (our legitimate interest).</li>
        <li>To remember optional preferences such as music volume (your consent, which you can withdraw at any time in cookie settings).</li>
        <li>To answer your messages and comply with the law.</li>
      </ul>

      <h2>4. Where your data is stored</h2>
      <p>Account and saved-flight data are stored with Supabase (authentication and database, project region: Europe). The site is hosted by Vercel. If you are not signed in, your flights and favourites stay only in your browser.</p>

      <h2>5. Third parties</h2>
      <p>To display the site, your browser contacts other services directly, which therefore receive your IP address: a content delivery network for airline logos (jsDelivr / GitHub), a host for globe images (unpkg), and providers of live aircraft position data. Links to SimBrief and FlightAware open their own websites, which have their own policies.</p>

      <h2>6. International transfers</h2>
      <p>Some providers may process data outside your country. Where required, we rely on appropriate safeguards such as standard contractual clauses.</p>

      <h2>7. How long we keep it</h2>
      <p>Account and saved-flight data are kept while your account exists. You can ask us to delete your account and data at any time, and we will do so without undue delay. Server logs are kept for a short period by our providers.</p>

      <h2>8. Your rights</h2>
      <p>You can ask to access, correct, delete, restrict or export your data, to object to processing, and to withdraw consent. Write to <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. You can also complain to your data protection authority (in Angola, the Agência de Protecção de Dados, under Law no. 22/11; in the EU, your national authority).</p>

      <h2>9. Security</h2>
      <p>We use encrypted connections and access rules so each user can only read and change their own saved data. No system is perfectly secure, so please use a strong, unique password.</p>

      <h2>10. Children</h2>
      <p>{LEGAL.site} is not intended for people under 16. If you believe a child has created an account, contact us and we will delete it.</p>

      <h2>11. Changes</h2>
      <p>We may update this policy. The date at the top shows the latest version.</p>
    </LegalPage>
  )
}
