import test from 'node:test'
import assert from 'node:assert/strict'
import { FlightObservations, airportDirection, flightIdentity, flightNumberPart, liveRouteHref } from '../lib/live-model.ts'

const flight = (patch = {}) => ({ hex: 'ABC123', callsign: 'DTA653', flightNumber: 'DT653', airlineIata: 'DT', airlineIcao: 'DTA', airlineName: 'TAAG', from: 'NBJ', to: 'LIS', fromCity: 'Luanda', toCity: 'Lisbon', lat: -9, lon: 13, altFt: 30000, onGround: false, observedAt: 1000, status: 'observed', remainingMinutes: null, ...patch })
test('a Luanda satellite assigns overflights only to the actual origin and destination', () => {
  const f = flight({ from: 'JNB', to: 'LHR' })
  assert.equal(airportDirection(f, 'NBJ'), null)
  assert.equal(airportDirection(f, 'JNB'), 'departing')
  assert.equal(airportDirection(f, 'LHR'), 'arriving')
  assert.equal(airportDirection(flight(), 'LAD'), 'departing')
})
test('flight identity retains numbers, published identities, and alphanumeric operational callsigns', () => {
  assert.equal(flightIdentity('DTA653', 'DT'), 'DT653')
  assert.equal(flightIdentity(' dta6ab ', 'DT'), 'DTA6AB')
  assert.equal(flightIdentity('DTA6AB', 'DT', 'DT653'), 'DT653')
  assert.equal(flightIdentity('GLO123', 'G3'), 'G3123')
  assert.equal(flightNumberPart('DTA653', 'DT', 'DTA'), '653')
  assert.equal(flightNumberPart('G3123', 'G3', 'GLO'), '123')
  assert.equal(flightNumberPart('DT', 'DT', 'DTA'), '')
})
test('a flight discovered elsewhere remains assigned to both endpoints, never the detection airport', () => {
  const store = new FlightObservations()
  store.record(flight())
  store.record(flight())
  assert.equal(store.list(1000).length, 1)
  assert.equal(store.list(1000).filter(f => airportDirection(f, 'LIS') === 'arriving').length, 1)
})
test('loss of observation becomes explicitly uncertain and expires without inventing remaining time', () => {
  const store = new FlightObservations(120000, 30000)
  store.record(flight())
  assert.equal(store.list(2000)[0].status, 'observed')
  assert.equal(store.list(32000)[0].status, 'estimated')
  assert.equal(store.list(32000)[0].remainingMinutes, null)
  assert.deepEqual(store.list(122000), [])
})
test('ground observations and unresolved routes remove old airborne associations', () => {
  const store = new FlightObservations()
  store.record(flight())
  store.record(flight({ onGround: true, observedAt: 2000 }))
  assert.deepEqual(store.list(2000), [])
  store.record(flight())
  store.record(flight({ callsign: 'BAW123', from: null, to: null, observedAt: 3000 }))
  assert.deepEqual(store.list(3000), [])
})
test('route links carry the complete flight number; unresolved identities do not create broken route links', () => {
  assert.equal(liveRouteHref(flight()), '/route/DT/NBJ-LIS?flight=DT653')
  assert.equal(liveRouteHref(flight({ airlineIata: '', airlineIcao: '' })), null)
})
test('history is bounded and a new observation replaces an old route for the same aircraft', () => {
  const store = new FlightObservations(120000, 30000, 2)
  store.record(flight())
  store.record(flight({ from: 'LIS', to: 'NBJ', observedAt: 2000 }))
  assert.equal(store.list(2000)[0].from, 'LIS')
  store.record(flight({ hex: 'BCD234' }))
  store.record(flight({ hex: 'CDE345' }))
  assert.deepEqual(store.list(2000).map(f => f.hex), ['BCD234', 'CDE345'])
})
