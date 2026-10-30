// Run under a process supervisor on a long-lived host, or call the protected endpoint from your scheduler.
const target = process.env.LIVE_SITE_URL
const token = process.env.LIVE_SYNC_TOKEN
if (!target || !token) throw new Error('Set LIVE_SITE_URL and server-only LIVE_SYNC_TOKEN')
const url = new URL('/api/live/sync', target)
if (!['https:', 'http:'].includes(url.protocol) || (url.protocol === 'http:' && !['localhost','127.0.0.1'].includes(url.hostname))) throw new Error('Use HTTPS outside localhost')
while (true) {
  try {
    const result = await fetch(url, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(290000) })
    const data = await result.json()
    console.log(JSON.stringify({ at: new Date().toISOString(), status: result.status, count: data.count, degraded: data.degraded, globalFeed: data.globalFeed }))
  } catch { console.error('Live sync failed; retrying next cycle') }
  await new Promise(resolve => setTimeout(resolve, 60000))
}
