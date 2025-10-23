import WebSocket from 'ws'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const WS_URL = 'ws://127.0.0.1:17332' + (process.env.WS_TOKEN ? `?token=${process.env.WS_TOKEN}` : '')
const JSON_PATH = path.join(os.homedir(), 'Documents', 'clipper_active_tab.json')

function publishToSelektor(evt){
  // TODO: vervang door jouw Selektor publish
  // bijv: selektor.publish('activeTab.changed', evt)
  console.log('[Selektor publish]', evt)
}

// Realtime via WebSocket
const ws = new WebSocket(WS_URL)
ws.on('open', () => console.log('[Selektor adapter] WS connected'))
ws.on('message', (msg) => {
  try { publishToSelektor({ type: 'activeTab.changed', payload: JSON.parse(String(msg)) }) } catch {}
})
ws.on('close', () => console.log('[Selektor adapter] WS closed'))
ws.on('error', () => {})

// Fallback via JSON polling
let last = ''
setInterval(() => {
  try {
    const raw = fs.readFileSync(JSON_PATH, 'utf-8')
    if (raw !== last) {
      last = raw
      publishToSelektor({ type: 'activeTab.changed', payload: JSON.parse(raw) })
    }
  } catch {}
}, 500)
