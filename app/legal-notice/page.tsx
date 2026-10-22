import type { Metadata } from 'next'
import { LegalPage } from '@/components/LegalPage'
import { LEGAL } from '@/lib/legal'

export const metadata: Metadata = { title: 'Legal Notice · MyRoster' }

export default function LegalNoticePage() {
  return (
    <LegalPage title="Legal Notice">
      <h2>Website owner</h2>
      <ul>
        <li><strong>Name:</strong> {LEGAL.owner}</li>
        <li><strong>Address:</strong> {LEGAL.address}</li>
        {LEGAL.taxId && <li><strong>Tax ID:</strong> {LEGAL.taxId}</li>}
        <li><strong>Email:</strong> <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a></li>
        <li><strong>Website:</strong> {LEGAL.url}</li>
      </ul>

      <h2>Purpose</h2>
      <p>{LEGAL.site} is a free website for exploring airline route networks and planning, timing and logging simulated flights. It is not a source of real flight, navigation or operational information.</p>

      <h2>Data sources and attribution</h2>
      <ul>
        <li>Airline, airport and route data derive from <a href="https://openflights.org/data.html">OpenFlights</a>, available under the Open Database License (ODbL). The data is a snapshot from around 2014 and is incomplete.</li>
        <li>Airline logos are loaded from a public community repository and are trademarks of their respective owners, used only to identify the airlines.</li>
        <li>Globe imagery and live aircraft position data come from third-party providers.</li>
      </ul>

      <h2>Trademarks</h2>
      <p>All airline, airport, aircraft and product names (including SimBrief, FlightAware and Microsoft Flight Simulator) are the property of their owners. {LEGAL.site} is not affiliated with or endorsed by them.</p>

      <h2>Intellectual property</h2>
      <p>The {LEGAL.site} name, logo, design and code belong to {LEGAL.owner}. All rights reserved, except for third-party material described above.</p>

      <h2>Liability and links</h2>
      <p>We work to keep the information accurate but give no guarantee of accuracy, completeness or availability. We are not responsible for external sites we link to. See the <a href="/terms">Terms &amp; Conditions</a>.</p>

      <h2>Governing law</h2>
      <p>This notice is governed by the laws of {LEGAL.country}.</p>
    </LegalPage>
  )
}
