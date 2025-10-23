const http = require('node:http')
const PORTS = Array.from({ length: 9 }, (_, i) => 9222 + i)

function httpGetJson (url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let data = ''
      res.on('data', (c) => (data += c))
      res.on('end', () => { try { resolve(JSON.parse(data)) } catch { resolve(null) } })
    })
    req.on('error', () => resolve(null))
    req.setTimeout(400, () => { try { req.destroy() } catch {} ; resolve(null) })
  })
}

async function findChromiumTargets () {
  for (const p of PORTS) {
    const list = await httpGetJson(`http://127.0.0.1:${p}/json/list`)
    if (Array.isArray(list) && list.length) return { port: p, targets: list }
  }
  return { port: 0, targets: [] }
}

function bestMatchTarget (targets, activeTitle) {
  if (!activeTitle) return null
  const canon = s => (s || '').trim()
  let t = targets.find(t => canon(t.title) === canon(activeTitle))
  if (!t) {
    t = targets.find(t => canon(activeTitle).startsWith(canon(t.title))) ||
        targets.find(t => canon(t.title).startsWith(canon(activeTitle))) ||
        targets.find(t => canon(activeTitle).includes(canon(t.title)) || canon(t.title).includes(canon(activeTitle)))
  }
  return t ? { ...t, audible: !!t.audible } : null
}

module.exports = { findChromiumTargets, bestMatchTarget }
