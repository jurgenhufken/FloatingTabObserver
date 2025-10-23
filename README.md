# Floating Tab Observer — v1.2 (Windows + macOS) + Firefox

## Start
- Windows → unzip → `start.cmd`
- macOS → unzip → `start.command` (eerste keer: geef Automatisering/Toegankelijkheid toestemming)

## Hotkeys
- Ctrl/Cmd + Alt + H : show/hide
- Ctrl/Cmd + Alt + C : click‑through toggle
- Ctrl/Cmd + Alt + P : compacte “pill” UI toggle

## Feeds
- JSON: `~/Documents/clipper_active_tab.json`
- WS  : `ws://127.0.0.1:17332`  (optioneel: `?token=XYZ` als WS_TOKEN is ingesteld)

## Firefox
`about:debugging#/runtime/this-firefox` → Load Temporary Add-on… → `firefox-extension/manifest.json` of installeer `firefox-extension.xpi`.

## Windows URL
Chromium starten met `--remote-debugging-port=9222` (scant 9222–9230) of gebruik de launchers onder `/launchers`.
