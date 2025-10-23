(function(){
  const WS_URL = 'ws://127.0.0.1:17334';
  let sock = null; let open = false; let timer = null;
  function connect(){ try { sock = new WebSocket(WS_URL); } catch(e){ schedule(); return; } sock.onopen = () => { open = true; sendActiveNow(); }; sock.onclose = sock.onerror = () => { open = false; schedule(); }; }
  function schedule(){ clearTimeout(timer); timer = setTimeout(connect, 1000); }
  function push(tab){ if(!open || !tab) return; const payload = { browser:'firefox', title: tab.title||'', url: tab.url||'', audible: !!tab.audible, source:'firefox-bridge' }; try { sock.send(JSON.stringify(payload)); } catch{} }
  async function getActiveTab(windowId){ try { const tabs = await browser.tabs.query({active:true, windowId}); return tabs && tabs[0] ? tabs[0] : null; } catch { return null; } }
  async function sendActiveNow(){ try { const win = await browser.windows.getLastFocused({windowTypes:['normal']}); if(!win) return; const tab = await getActiveTab(win.id); if(tab) push(tab); } catch{} }
  browser.tabs.onActivated.addListener(async ({tabId, windowId})=>{ try{ const t=await browser.tabs.get(tabId); push(t);}catch{} });
  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab)=>{ if('audible' in changeInfo || 'title' in changeInfo || 'url' in changeInfo) push(tab); });
  browser.windows.onFocusChanged.addListener(async (wid)=>{ if(wid===browser.windows.WINDOW_ID_NONE) return; const tab = await getActiveTab(wid); if(tab) push(tab); });
  connect();
})();