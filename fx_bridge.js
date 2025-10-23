const { WebSocketServer } = require('ws')
function startFirefoxBridge (onPayload) { try { const wss = new WebSocketServer({ host: '127.0.0.1', port: 17334 }); wss.on('connection', (ws) => { ws.on('message', (data) => { try { const p = JSON.parse(String(data)); if (p && p.browser === 'firefox') onPayload({ ...p, source: 'firefox-bridge' }) } catch {} }) }); return wss } catch (e) { return null } }

module.exports = { startFirefoxBridge }
