# Floating Tab Observer — v1.2 (Windows + macOS) + Firefox

Floating Tab Observer is een cross-platform Electron overlay die de actieve browser tab toont, klikdoorlaatbaarheid kan toggelen, en zowel JSON- als WebSocket-feeds levert voor integraties (Selektor, Clipper, etc.). De release bevat macOS-automatiseringshulpmiddelen, Windows CDP-scanners en een Firefox-brug.

## Overzicht
- Transparante, always-on-top overlay met pijler/pill-modus (`renderer/index.html`).
- Automatische opslag van vensterpositie/instellingen via `settings.js` in `~/Documents/FloatingTabObserver/settings.json`.
- Active-tab-detectie: macOS AppleScript (`main.js`), Windows via `active-win` + CDP (`cdp.js`).
- IPC-uitvoer: JSON bestand (`clipper_active_tab.json`) en WebSocket `ws://127.0.0.1:17332` (`main.js`).
- Firefox-brug via `firefox-extension/background.js` naar `ws://127.0.0.1:17334`.

## Requirements
- **Node.js 18+** (Electron 31 en `active-win` vereisen minimaal Node 18.18).
- **macOS 13+ of Windows 10+** (beide getest; Linux wordt niet ondersteund).
- **macOS rechten**: Accessibility + Automation voor Electron (zie beneden).
- **Chrome/Edge/Brave/Vivaldi**: start met `--remote-debugging-port` indien CDP nodig is (Windows).

## Installatie (Node workflow)
```bash
git clone https://github.com/jurgenhufken/FloatingTabObserver.git
cd FloatingTabObserver
npm install
```

### Starten
- **macOS**
  ```bash
  env -u ELECTRON_RUN_AS_NODE npm start
  ```
  Of gebruik `start.command`. Geef bij de eerste start toestemming voor Accessibility en Automation wanneer macOS daarom vraagt.
- **Windows**
  ```powershell
  npm start
  ```
  Of dubbelklik op `start.cmd`. Zorg dat Chromium-browserprocessen beschikbaar zijn met CDP (`chrome --remote-debugging-port=9222`). De map `launchers/` bevat scripts (`chrome_with_cdp.*`, `edge_with_cdp.*`).

## macOS Automatisering & Accessibility
- `main.js` bevat `requestAutomationConsent()` dat via `⌘ + ⌥ + A` (Command+Alt+A) expliciet AppleScript-prompts triggert.
- Controleer **System Settings → Privacy & Security → Accessibility** en **Automation** en vink **Electron** (of `FloatingTabObserver`) aan voor `System Events`, Chrome, Safari, etc.

## Hotkeys (configuratie in `main.js`)
- **⌘/Ctrl + ⌥/Alt + H**: Overlay tonen/verbergen.
- **⌘/Ctrl + ⌥/Alt + C**: Klikdoorlaatbaarheid toggelen (`BrowserWindow#setIgnoreMouseEvents`).
- **⌘/Ctrl + ⌥/Alt + P**: Compacte pill-UI toggelen (`renderer/renderer.js`).
- **⌘/Ctrl + ⌥/Alt + A**: Automatiseringsprompt opnieuw forceren (macOS).

## Firefox integratie
- Voeg de tijdelijke add-on toe via `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on…** → kies `firefox-extension/manifest.json`.
- Bij start maakt `firefox-extension/background.js` een WebSocket naar `ws://127.0.0.1:17334` en forwardt actieve tab updates naar de hoofdapp (`startFirefoxBridge()` in `main.js`).
- Voor langdurig gebruik kan `firefox-extension.xpi` geladen worden (handtekening vereist voor permanente installatie).

## Data & Integraties
- **JSON feed**: `~/Documents/clipper_active_tab.json` (macOS/ Windows). Wordt overschreven met de laatst bekende tab.
- **WebSocket**: `ws://127.0.0.1:17332` (`WS_TOKEN` optioneel via env var). Zie `examples/clipper_ws_listener.py` en `examples/selektor_adapter.js`.
- **Polling fallback**: `examples/clipper_poll_listener.py` toont hoe je het JSON-bestand kunt monitoren.
- **Client feedback**: bij een fout token stuurt de server `{ type: 'error', reason: 'invalid_token' }` voordat de socket sluit. Clients moeten dit afhandelen.

## Omgevingsvariabelen
- `WS_TOKEN`: wanneer gezet, moeten WebSocket-clients `?token=XYZ` meegeven (zie `main.js`).
- `FTO_LOOP_MS` *(optioneel)*: pas interval aan door `setInterval(loop, …)` in `main.js` te wijzigen.

## Troubleshooting
- **Electron-venster blijft leeg**: Controleer macOS permissies; run `⌘ + ⌥ + A`. Bekijk `~/Documents/clipper_active_tab.json` voor status.
- **Port conflicts**: poorten `17332` (overlay) en `17334` (Firefox) moeten vrij zijn. Gebruik `lsof -i :17332` om processen te vinden.
- **Firefox toont enkel kort info**: Zorg dat `main.js` (v1.2 patch) actief is en dat de Firefox add-on opnieuw geladen is na updates.
- **Windows CDP**: wanneer `findChromiumTargets()` niets vindt, herstart browser met `--remote-debugging-port=9222` of gebruik `launchers/` scripts.
- **Invalid token status**: overlay toont onderaan een foutmelding wanneer een WS-client met een verkeerd token verbind. Pas `WS_TOKEN` aan of update clients.

## Verdere documentatie
- `WINDSURF_GUIDE.md`: bevat scenario-specifiche instructies voor Windsurf integraties.
- `firefox-extension/background.js`: WebSocket bridge implementatie.
- `fx_bridge.js`: interne WS-brug binnen Electron.
