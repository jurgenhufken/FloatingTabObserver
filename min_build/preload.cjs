// FTO_MIN_no_ws_v1/preload.cjs
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('floatingTab', {
  onTabInfo: (cb) => ipcRenderer.on('tab-info', (_, p) => cb(p)),
  onMode:    (cb) => ipcRenderer.on('mode',     (_, m) => cb(m)),
});
