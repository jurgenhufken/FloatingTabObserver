# Windsurf Setup & Selektor Integratie — v1.2

## 1) Open & run
```bash
npm i
npm start
```
Windows: dubbelklik `start.cmd`.  macOS: dubbelklik `start.command` (1e keer rechten voor Automatisering/Toegankelijkheid).

## 2) Firefox
`about:debugging#/runtime/this-firefox` → Load Temporary Add-on → `firefox-extension/manifest.json`
of installeer `firefox-extension.xpi`.

## 3) Selektor integratie
- JSON: `~/Documents/clipper_active_tab.json` (poll 300–500ms)
- WebSocket: `ws://127.0.0.1:17332` (push) — optioneel `?token=XYZ` als WS_TOKEN is gezet.

**Event topic:** `activeTab.changed`  
**Payload:** `{ browser, title, url, audible, ts, source }`

## 4) Windows URL (CDP)
Start Chrome/Edge/Brave/Vivaldi met `--remote-debugging-port=9222` of gebruik de meegeleverde launchers onder `/launchers`.

## 5) Debug
Zie `RUN & DEBUG` (Electron Main) of voeg `launch.json` toe. Hot‑reload mogelijk met `nodemon`.
