import { app, BrowserWindow, nativeTheme, globalShortcut } from 'electron'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'
import { exec } from 'node:child_process'
import { loadSettings, saveSettings } from './settings.js'
import { findChromiumTabByTitle } from './cdp.js'
const isMac=process.platform==='darwin', isWin=process.platform==='win32'; let settings=loadSettings()
const BUNDLE_ID_TO_NAME={'com.google.Chrome':'Google Chrome','com.brave.Browser':'Brave Browser','com.microsoft.edgemac':'Microsoft Edge','com.vivaldi.Vivaldi':'Vivaldi','com.apple.Safari':'Safari'}
const AS_FRONT_APP_BUNDLE=`tell application "System Events"
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
const AS_CHROME_TAB=(n)=>`tell application "${n}"
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
const AS_SAFARI_TAB=`tell application "Safari"
  if (count of windows) is 0 then return "||"
  set t to current tab of front window
  set u to URL of t
  set ti to name of t
  return ti & "|" & u & "|false"
end tell`
function osa(s){return new Promise(r=>{exec(`osascript -e "${s.replaceAll('"','\\"')}"`,{timeout:900},(e,o)=>r(e?'':String(o).trim()))})}
async function macFrontBundle(){return await osa(AS_FRONT_APP_BUNDLE)}
async function macTabInfo(b){if(!BUNDLE_ID_TO_NAME[b])return{title:'',url:'',audible:false,browser:''};const raw=(b==='com.apple.Safari')?await osa(AS_SAFARI_TAB):await osa(AS_CHROME_TAB(BUNDLE_ID_TO_NAME[b]));const [title='',url='',aud='false']=String(raw).split('|');return{title,url,audible:aud.toLowerCase()==='true',browser:BUNDLE_ID_TO_NAME[b]}}
const JSON_PATH=path.join(os.homedir(),'Documents','clipper_active_tab.json'); function writeJSONFileAtomic(p){try{const t=JSON_PATH+'.tmp';fs.writeFileSync(t,JSON.stringify(p,null,2));fs.renameSync(t,JSON_PATH)}catch{}}
let win,lastFP=''; const fp=p=>[p.browser||'',p.title||'',p.url||'',p.audible?'1':'0'].join('\u0001')
let activeWinFn=null
async function createWindow(){const b=settings.bounds||{x:60,y:80,width:560,height:110}; win=new BrowserWindow({width:b.width,height:b.height,x:b.x,y:b.y,frame:false,transparent:true,resizable:true,alwaysOnTop:true,hasShadow:true,movable:true,skipTaskbar:true,fullscreenable:false,focusable:isWin?false:true,show:false,titleBarStyle:'hiddenInset',webPreferences:{preload:path.join(process.cwd(),'preload.cjs'),devTools:true,nodeIntegration:false,contextIsolation:true}}); try{win.setAlwaysOnTop(true,'floating',1)}catch{}; try{if(isMac)win.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true})}catch{}; win.on('moved',saveBounds); win.on('resized',saveBounds); await win.loadFile(path.join(process.cwd(),'renderer','index.html')); try{if(isMac)win.showInactive();else win.show()}catch{win.show()} ; applyClickThrough(settings.clickThrough); win.webContents.send('mode',{compact:!!settings.compact}); setInterval(loop,300)}
function saveBounds(){try{const [x,y]=win.getPosition();const [w,h]=win.getSize();settings.bounds={x,y,width:w,height:h};saveSettings(settings)}catch{}}
function applyClickThrough(on){settings.clickThrough=!!on;saveSettings(settings);try{win.setIgnoreMouseEvents(!!on,{forward:true})}catch{}}
function toggleCompact(){settings.compact=!settings.compact;saveSettings(settings);win.webContents.send('mode',{compact:!!settings.compact})}
function emit(p){const out={...p,ts:Date.now(),source:'min'}; const cur=fp(out); if(cur===lastFP)return; lastFP=cur; try{win?.webContents?.send('tab-info',out)}catch{}; writeJSONFileAtomic(out)}
async function loop(){
  if (isMac) {
    const bundle = await macFrontBundle();
    const tab = await macTabInfo(bundle);
    if (tab) emit(tab);
    return;
  }

  if (isWin) {
    if (!activeWinFn) {
      try {
        const mod = await import('active-win');
        activeWinFn = mod.default || mod;
      } catch (err) {
        console.error('[min] failed to load active-win', err?.message);
        return;
      }
    }

    const act = await activeWinFn();
    const proc = (act?.owner?.name || '').toLowerCase();
    const title = act?.title || '';
    const chromium = ['chrome.exe', 'msedge.exe', 'brave.exe', 'vivaldi.exe'];
    let url = '', audible = false, browser = act?.owner?.name || '';
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
function registerHotkeys(){const mod=isMac?'Command+Alt':'Control+Alt'; globalShortcut.register(mod+'+H',()=>{if(!win)return; win.isVisible()?win.hide():(isMac?win.showInactive():win.show())}); globalShortcut.register(mod+'+C',()=>applyClickThrough(!settings.clickThrough)); globalShortcut.register(mod+'+P',()=>toggleCompact())}
app.whenReady().then(async()=>{if(isMac)app.dock.hide(); nativeTheme.themeSource='dark'; await createWindow(); registerHotkeys()})
app.on('will-quit',()=>{globalShortcut.unregisterAll()})
app.on('window-all-closed',()=>{if(!isMac)app.quit()})
