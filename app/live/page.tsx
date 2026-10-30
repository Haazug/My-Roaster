import LiveFlights from '@/components/LiveFlights'
export default function LivePage() {
  return <section className="min-h-screen p-5 pb-32 sm:p-8">
    <h1 className="text-4xl font-semibold">Live now</h1>
    <p className="mt-3 text-sm text-white/45">Live routes by airline. Airport observations discover flights and associate them with their identified origin and destination.</p>
    <LiveFlights />
  </section>
}
