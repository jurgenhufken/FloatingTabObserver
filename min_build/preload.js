import { contextBridge, ipcRenderer } from 'electron'
contextBridge.exposeInMainWorld('floatingTab', {
  onTabInfo: (cb) => ipcRenderer.on('tab-info', (_, p) => cb(p)),
  onMode: (cb) => ipcRenderer.on('mode',   (_, m) => cb(m))
})
