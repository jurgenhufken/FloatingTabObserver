const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('floatingTab', {
  onTabInfo: (cb) => ipcRenderer.on('tab-info', (_, p) => cb(p)),
  onMode: (cb) => ipcRenderer.on('mode', (_, m) => cb(m))
})
