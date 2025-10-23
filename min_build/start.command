#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "[!] Node.js niet gevonden. Installeer eerst Node 18+ (bijv. https://nodejs.org/)";
  read -n 1 -s -r -p "Druk op een toets om af te sluiten..."; echo; exit 1
fi
npm ci --omit=dev || npm install
npm start
