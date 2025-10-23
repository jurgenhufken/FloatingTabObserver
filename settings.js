const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

const DIR = path.join(os.homedir(), 'Documents', 'FloatingTabObserver')
const FILE = path.join(DIR, 'settings.json')

const defaults = { clickThrough: false, compact: true, bounds: { x: 40, y: 60, width: 500, height: 96 } }

function loadSettings () {
  try { fs.mkdirSync(DIR, { recursive: true }); const raw = fs.readFileSync(FILE, 'utf-8'); const data = JSON.parse(raw); return { ...defaults, ...data, bounds: { ...defaults.bounds, ...(data.bounds||{}) } } } catch { return { ...defaults } }
}
function saveSettings (data) { try { fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(data, null, 2)) } catch {} }

module.exports = { loadSettings, saveSettings }
