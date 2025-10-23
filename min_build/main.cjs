// main.cjs — CommonJS bootstrap for Floating Tab Observer minimal build
const { app, BrowserWindow, nativeTheme, globalShortcut } = require('electron');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { exec } = require('node:child_process');
const http = require('node:http');

const isMac = process.platform === 'darwin';
const isWin = process.platform === 'win32';

// --- Settings (inline CJS helpers) ---
const SETTINGS_DIR = path.join(os.homedir(), 'Documents', 'FloatingClipperMin');
const SETTINGS_FILE = path.join(SETTINGS_DIR, 'settings.json');
const defaults = { clickThrough: false, compact: false, bounds: { x: 60, y: 80, width: 560, height: 110 } };
function loadSettings () {
  try {
    fs.mkdirSync(SETTINGS_DIR, { recursive: true });
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return { ...defaults, ...data, bounds: { ...defaults.bounds, ...(data.bounds || {}) } };
  } catch {
    return { ...defaults };
  }
}
function saveSettings (data) {
  try {
    fs.mkdirSync(SETTINGS_DIR, { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
  } catch {}
}
let settings = loadSettings();

// --- macOS AppleScript helpers ---
const BUNDLE_ID_TO_NAME = {
  'com.google.Chrome': 'Google Chrome',
  'com.brave.Browser': 'Brave Browser',
  'com.microsoft.edgemac': 'Microsoft Edge',
  'com.vivaldi.Vivaldi': 'Vivaldi',
  'com.apple.Safari': 'Safari',
  'org.mozilla.firefox': 'Firefox'
};
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
end try`;
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
end tell`;
const AS_SAFARI_TAB = `tell application "Safari"
  if (count of windows) is 0 then return "||"
  set t to current tab of front window
  set u to URL of t
  set ti to name of t
  return ti & "|" & u & "|false"
end tell`;
const AS_FIREFOX_TAB = `tell application "Firefox"
  if (count of windows) is 0 then return "||"
  set t to active tab of front window
  set u to URL of t
  set ti to name of t
  return ti & "|" & u & "|false"
end tell`;
const AS_FIREFOX_FALLBACK = `tell application "System Events"
  tell application process "Firefox"
    if (count of windows) is 0 then return "||"
    set theWindow to front window
    set ti to name of theWindow
    set theURL to ""
    try
      set theURL to value of text field 1 of toolbar 1 of theWindow
    on error
      try
        set theURL to value of (first text field whose value contains "://") of toolbar 1 of theWindow
      on error
        set theURL to ""
      end try
    end try
    return ti & "|" & theURL & "|false"
  end tell
end tell`;
function osa (script) {
  return new Promise((resolve) => {
    exec(`osascript -e "${script.replaceAll('"', '\\"')}"`, { timeout: 900 }, (err, stdout) => {
      resolve(err ? '' : String(stdout).trim());
    });
  });
}
async function macFrontBundle () {
  return await osa(AS_FRONT_APP_BUNDLE);
}
async function macTabInfo (bundleId) {
  if (!BUNDLE_ID_TO_NAME[bundleId]) return null;
  let raw;
  if (bundleId === 'com.apple.Safari') {
    raw = await osa(AS_SAFARI_TAB);
  } else if (bundleId === 'org.mozilla.firefox') {
    raw = await osa(AS_FIREFOX_TAB);
    if (!raw || raw.startsWith('||')) {
      raw = await osa(AS_FIREFOX_FALLBACK);
    }
  } else {
    raw = await osa(AS_CHROME_TAB(BUNDLE_ID_TO_NAME[bundleId]));
  }
  const [title = '', url = '', audibleStr = 'false'] = String(raw || '').split('|');
  if (!title && !url) return null;
  return { title, url, audible: audibleStr.toLowerCase() === 'true', browser: BUNDLE_ID_TO_NAME[bundleId] };
}

// --- Windows helpers: dynamic active-win + CDP lookup ---
let activeWinCached = null;
async function getActiveWin () {
  if (!isWin) return null;
  if (!activeWinCached) {
    try {
      const mod = await import('active-win');
      activeWinCached = mod.default || mod;
    } catch (err) {
      console.error('[min] failed to load active-win', err?.message);
      return null;
    }
  }
  try {
    return await activeWinCached();
  } catch (err) {
    console.error('[min] active-win error', err?.message);
    return null;
  }
}
const CDP_PORTS = Array.from({ length: 9 }, (_, i) => 9222 + i);
function httpGetJson (url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(400, () => {
      try { req.destroy(); } catch {}
      resolve(null);
    });
  });
}
async function findChromiumTabByTitle (title) {
  for (const port of CDP_PORTS) {
    const list = await httpGetJson(`http://127.0.0.1:${port}/json/list`);
    if (!Array.isArray(list)) continue;
    const canon = (s) => (s || '').trim();
    let tab = list.find((item) => canon(item.title) === canon(title));
    if (!tab) {
      tab = list.find((item) => canon(title).includes(canon(item.title)) || canon(item.title).includes(canon(title)));
    }
    if (tab) {
      return { port, url: tab.url || '', audible: !!tab.audible };
    }
  }
  return { port: 0, url: '', audible: false };
}

// --- JSON mirror ---
const JSON_PATH = path.join(os.homedir(), 'Documents', 'clipper_active_tab.json');
function writeJSONFileAtomic (payload) {
  try {
    const tmp = JSON_PATH + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(payload, null, 2));
    fs.renameSync(tmp, JSON_PATH);
  } catch {}
}

// --- Window / UI bootstrap ---
let win;
let lastFingerprint = '';
const fingerprint = (p) => [p.browser || '', p.title || '', p.url || '', p.audible ? '1' : '0'].join('\u0001');

async function createWindow () {
  const bounds = settings.bounds || { x: 60, y: 80, width: 560, height: 110 };
  win = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: true,
    hasShadow: true,
    movable: true,
    skipTaskbar: true,
    fullscreenable: false,
    focusable: isWin ? false : true,
    show: false,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(process.cwd(), 'preload.cjs'),
      devTools: true,
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  try { win.setAlwaysOnTop(true, 'floating', 1); } catch {}
  try { if (isMac) win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true }); } catch {}

  win.on('moved', saveBounds);
  win.on('resized', saveBounds);

  await win.loadFile(path.join(process.cwd(), 'renderer', 'index.html'));
  try { if (isMac) win.showInactive(); else win.show(); } catch { win.show(); }

  applyClickThrough(settings.clickThrough);
  win.webContents.send('mode', { compact: !!settings.compact });

  setInterval(loop, 300);
}

function saveBounds () {
  try {
    const [x, y] = win.getPosition();
    const [w, h] = win.getSize();
    settings.bounds = { x, y, width: w, height: h };
    saveSettings(settings);
  } catch {}
}

function applyClickThrough (on) {
  settings.clickThrough = !!on;
  saveSettings(settings);
  try { win.setIgnoreMouseEvents(!!on, { forward: true }); } catch {}
}

function toggleCompact () {
  settings.compact = !settings.compact;
  saveSettings(settings);
  win.webContents.send('mode', { compact: !!settings.compact });
}

function emit (payload) {
  const out = { ...payload, ts: Date.now(), source: 'min' };
  const cur = fingerprint(out);
  if (cur === lastFingerprint) return;
  lastFingerprint = cur;
  try { win?.webContents?.send('tab-info', out); } catch {}
  writeJSONFileAtomic(out);
}

// --- Main loop ---
async function loop () {
  if (isMac) {
    const bundle = await macFrontBundle();
    const info = await macTabInfo(bundle);
    if (info) emit(info);
    return;
  }

  if (isWin) {
    const act = await getActiveWin();
    if (!act) return;
    const proc = (act.owner?.name || '').toLowerCase();
    const title = act.title || '';
    const chromium = ['chrome.exe', 'msedge.exe', 'brave.exe', 'vivaldi.exe'];
    let url = '';
    let audible = false;
    let browser = act.owner?.name || '';
    if (chromium.includes(proc)) {
      const info = await findChromiumTabByTitle(title);
      url = info.url || '';
      audible = !!info.audible;
      browser = proc.replace('.exe', '');
    }
    emit({ browser, title, url, audible });
    return;
  }
}

// --- Hotkeys ---
function registerHotkeys () {
  const mod = isMac ? 'Command+Alt' : 'Control+Alt';
  globalShortcut.register(mod + '+H', () => {
    if (!win) return;
    if (win.isVisible()) win.hide(); else (isMac ? win.showInactive() : win.show());
  });
  globalShortcut.register(mod + '+C', () => applyClickThrough(!settings.clickThrough));
  globalShortcut.register(mod + '+P', () => toggleCompact());
}

// --- App bootstrap ---
app.whenReady().then(async () => {
  if (isMac) app.dock.hide();
  nativeTheme.themeSource = 'dark';
  await createWindow();
  registerHotkeys();
});
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => { if (!isMac) app.quit(); });
