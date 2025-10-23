const http = require('node:http')
const PORTS = Array.from({ length: 9 }, (_, i) => 9222 + i)
function httpGetJson (url) { return new Promise((resolve) => { const req = http.get(url, (res) => { let data = ''; res.on('data', (c) => (data += c)); res.on('end', () => { try { resolve(JSON.parse(data)) } catch { resolve(null) } }) }); req.on('error', () => resolve(null)); req.setTimeout(400, () => { try { req.destroy() } catch {} ; resolve(null) }) }) }
async function findChromiumTargets () { for (const p of PORTS) { const list = await httpGetJson(`http://127.0.0.1:${p}/json/list`); if (Array.isArray(list) && list.length) return { port: p, targets: list } } return { port: 0, targets: [] } }
function bestMatchTarget (targets, activeTitle) { if (!activeTitle) return null; let t = targets.find(t => (t.title || '').trim() === activeTitle.trim()); if (t) return t; t = targets.find(t => (activeTitle || '').startsWith((t.title || ''))) || targets.find(t => (t.title || '').startsWith((activeTitle || ''))) || targets.find(t => (activeTitle || '').includes((t.title || '')) || (t.title || '').includes((activeTitle || ''))); return t || null }

module.exports = { findChromiumTargets, bestMatchTarget }
