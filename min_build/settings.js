import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
const DIR = path.join(os.homedir(), 'Documents', 'FloatingClipperMin')
const FILE = path.join(DIR, 'settings.json')
const defaults = { clickThrough: false, compact: false, bounds: { x: 60, y: 80, width: 560, height: 110 } }
export function loadSettings () { try { fs.mkdirSync(DIR, { recursive: true }); const raw = fs.readFileSync(FILE, 'utf-8'); const data = JSON.parse(raw); return { ...defaults, ...data, bounds: { ...defaults.bounds, ...(data.bounds||{}) } } } catch { return { ...defaults } } }
export function saveSettings (data) { try { fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(data, null, 2)) } catch {} }
