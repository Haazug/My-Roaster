const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto')
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
test('cache-independent icon paths serve the known black-on-white originals across browser, Apple and install metadata',()=>{
 const pairs=[['favicon-32.png','favicon'],['icon-192.png','icon-192'],['icon-512.png','icon-512'],['apple-icon.png','apple-icon'],['icon-maskable-512.png','maskable-icon']]
 for(const [original,name] of pairs)assert.equal(sha(`public/${original}`),sha(`public/brand/myroster-${name}-v223-fix.png`))
 const layout=fs.readFileSync('app/layout.tsx','utf8');assert(layout.includes('/brand/myroster-favicon-v223-fix.png'));assert(!layout.includes('?v=2.2.2'))
 const manifest=JSON.parse(fs.readFileSync('public/manifest-v223-fix.webmanifest','utf8'))
 assert.equal(manifest.id,'/');assert.equal(manifest.background_color,'#ffffff');assert(manifest.icons.every(icon=>icon.src.startsWith('/brand/myroster-')&&fs.existsSync('public'+icon.src)))
})
