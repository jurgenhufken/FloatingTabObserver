const path = require('node:path')
const os = require('node:os')
const fs = require('node:fs')
const { exec } = require('node:child_process')
const { URL } = require('node:url')
const { app, BrowserWindow, nativeTheme, globalShortcut } = require('electron')
const { WebSocketServer } = require('ws')
const { findChromiumTargets, bestMatchTarget } = require('./cdp')
const { loadSettings, saveSettings } = require('./settings')
const { startFirefoxBridge } = require('./fx_bridge')

const isMac = process.platform === 'darwin'
const isWin = process.platform === 'win32'
let settings = loadSettings()

// macOS AppleScript helpers
const BUNDLE_ID_TO_NAME = { 'com.google.Chrome': 'Google Chrome', 'com.brave.Browser': 'Brave Browser', 'com.microsoft.edgemac': 'Microsoft Edge', 'com.vivaldi.Vivaldi': 'Vivaldi', 'com.apple.Safari': 'Safari' }

let activeWinGetter
function getActiveWin () {
  if (activeWinGetter === undefined) {
    try {
      const mod = require('active-win')
      activeWinGetter = mod?.activeWindow || null
    } catch {
      activeWinGetter = null
    }
  }
  return activeWinGetter
}
const AS_FRONT_APP_BUNDLE = `tell application "System Events"
  set frontApp to name of first process whose frontmost is true
end tell
try
  tell application id frontApp to id of it
on error
  try
    tell application frontApp to id of it
  on error
    return ""
  end try
end try`
const AS_CHROME_TAB = (appName) => `tell application "${appName}"
  if (count of windows) is 0 then return "||"
  set t to active tab of front window
  set u to URL of t
  set ti to title of t
  try
    set au to audible of t
  on error
    set au to false
  end try
  return ti & "|" & u & "|" & (au as string)
end tell`
const AS_SAFARI_TAB = `tell application "Safari"
  if (count of windows) is 0 then return "||"
  set t to current tab of front window
  set u to URL of t
  set ti to name of t
  return ti & "|" & u & "|false"
end tell`
function osa (script) { return new Promise((resolve) => { exec(`osascript -e "${script.replaceAll('"', '\\"')}"`, { timeout: 900 }, (err, stdout) => { resolve(err ? '' : String(stdout).trim()) }) }) }
async function macFrontBundle () { return await osa(AS_FRONT_APP_BUNDLE) }
async function macTabInfo (bundleId) {
  if (!BUNDLE_ID_TO_NAME[bundleId]) return null
  let raw = (bundleId === 'com.apple.Safari') ? await osa(AS_SAFARI_TAB) : await osa(AS_CHROME_TAB(BUNDLE_ID_TO_NAME[bundleId]))
  if (!raw) return null
  const [title = '', url = '', audibleStr = 'false'] = String(raw).split('|')
  return { title, url, audible: audibleStr.toLowerCase() === 'true', browser: BUNDLE_ID_TO_NAME[bundleId], source:'applescript' }
}

// IPC sinks (broadcast + JSON)
const WS_PORT = 17332
const WS_TOKEN = process.env.WS_TOKEN || ''  // optional
const JSON_PATH = path.join(os.homedir(), 'Documents', 'clipper_active_tab.json')
let wss
function startWS () {
  try {
    wss = new WebSocketServer({ host: '127.0.0.1', port: WS_PORT })
    // optional token auth
    if (WS_TOKEN) {
      wss.on('connection', (ws, req) => {
        try {
          const u = new URL(req.url, 'ws://127.0.0.1')
          const t = u.searchParams.get('token') || ''
          if (t !== WS_TOKEN) { try { ws.close(1008, 'invalid token') } catch {} }
        } catch {}
      })
    }
  } catch { wss = null }
}
function broadcastWS (payload) {
  if (!wss) return
  const msg = JSON.stringify(payload)
  for (const c of wss.clients) { try { c.send(msg) } catch {} }
}
function writeJSONFile (payload) { try { fs.writeFileSync(JSON_PATH, JSON.stringify(payload, null, 2)) } catch {} }

let win, lastFP = ''
const fp = (p) => [p.browser||'', p.title||'', p.url||'', p.audible?'1':'0'].join('\u0001')

async function createWindow () {
  const b = settings.bounds || { x:40, y:60, width:500, height:96 }
  win = new BrowserWindow({ width: b.width, height: b.height, x: b.x, y: b.y, frame:false, transparent:true, resizable:true, alwaysOnTop:true, hasShadow:true, movable:true, skipTaskbar:true, fullscreenable:false, focusable:isWin?false:true, show:false, titleBarStyle:'hiddenInset', trafficLightPosition:{x:-100,y:-100}, webPreferences:{ preload:path.join(process.cwd(),'preload.js'), devTools:true, nodeIntegration:false, contextIsolation:true } })
  try { win.setAlwaysOnTop(true, 'floating', 1) } catch {}
  try { if (isMac) win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true }) } catch {}
  win.on('moved', saveBounds); win.on('resized', saveBounds)
  await win.loadFile(path.join(process.cwd(), 'renderer', 'index.html'))
  try { if (isMac) win.showInactive(); else win.show() } catch { win.show() }
  applyClickThrough(settings.clickThrough)
  win.webContents.send('mode', { compact: !!settings.compact })
  startWS()
  startFirefoxBridge((payload)=>{ emit({ ...payload, browser: payload.browser || 'firefox' }) })  // Firefox inbound
  setInterval(loop, 300)  // 300ms default
}

function saveBounds () { try { const [x,y]=win.getPosition(); const [width,height]=win.getSize(); settings.bounds={x,y,width,height}; saveSettings(settings) } catch {} }
function applyClickThrough (on) { settings.clickThrough=!!on; saveSettings(settings); try { win.setIgnoreMouseEvents(!!on,{forward:true}) } catch {} }
function toggleCompact () { settings.compact=!settings.compact; saveSettings(settings); win.webContents.send('mode',{compact:!!settings.compact}) }

function emit (payload) {
  const out = { ...payload, ts: Date.now(), source: payload.source || payload._source || 'unknown' }
  const cur = fp(out)
  if (cur===lastFP) return
  lastFP=cur
  try { win?.webContents?.send('tab-info', out) } catch {}
  writeJSONFile(out)
  broadcastWS(out)
}

async function loop () {
  const payload = await readActiveTab()
  if (payload) emit(payload)
}

let automationRequested = false
async function requestAutomationConsent (force = false) {
  if (!isMac) return
  if (automationRequested && !force) return
  automationRequested = true
  const scripts = [
    'tell application "System Events" to count processes',
    'tell application "System Events" to name of first process whose frontmost is true'
  ]
  for (const name of Object.values(BUNDLE_ID_TO_NAME)) {
    scripts.push(`tell application "${name}" to get name`)
  }
  for (const s of scripts) {
    try { await osa(s) } catch {}
  }
}

async function readActiveTab () {
  if (isMac) {
    await requestAutomationConsent()
    const bundle = await macFrontBundle()
    const info = await macTabInfo(bundle)
    if (!info && bundle === 'org.mozilla.firefox') return null
    return info
  }
  if (isWin) {
    const activeWin = getActiveWin()
    if (!activeWin) return null
    const act = await activeWin()
    const proc = (act?.owner?.name || '').toLowerCase()
    const title = act?.title || ''
    const chromiumProcs = ['chrome.exe', 'msedge.exe', 'brave.exe', 'vivaldi.exe']
    const isChromium = chromiumProcs.includes(proc)
    if (isChromium) {
      const { targets } = await findChromiumTargets()
      const match = bestMatchTarget(targets, title)
      if (match) {
        const url = match.url || ''
        const browser = proc.replace('.exe','')
        return { browser, title, url, audible: false, source:'cdp' }
      }
    }
    return { browser: act?.owner?.name || '', title, url: '', audible: false, source:'active-win' }
  }
  return null
}

function registerHotkeys () {
  const mod = isMac ? 'Command+Alt' : 'Control+Alt'
  globalShortcut.register(mod + '+H', () => { if (!win) return; win.isVisible() ? win.hide() : (isMac ? win.showInactive() : win.show()) })
  globalShortcut.register(mod + '+C', () => applyClickThrough(!settings.clickThrough))
  globalShortcut.register(mod + '+P', () => toggleCompact())
  globalShortcut.register(mod + '+A', () => { requestAutomationConsent(true) })
}

app.whenReady().then(async () => {
  if (isMac) app.dock.hide()
  nativeTheme.themeSource = 'dark'
  await requestAutomationConsent()
  await createWindow()
  registerHotkeys()
})
app.on('will-quit', () => { globalShortcut.unregisterAll() })
app.on('window-all-closed', () => { if (!isMac) app.quit() })
