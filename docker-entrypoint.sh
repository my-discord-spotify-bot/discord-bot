#!/usr/bin/env bash
set -euo pipefail

DEVICE_NAME="${SPOTIFY_DEVICE_NAME:-Muzika Bot}"
BITRATE="${SPOTIFY_BITRATE:-160}"

# Validate binaries
command -v librespot >/dev/null || { echo "❌ librespot non trouvé"; exit 1; }
command -v node >/dev/null || { echo "❌ node non trouvé"; exit 1; }

# Parse additional librespot arguments
if [[ -n "${LIBRESPOT_ARGS:-}" ]]; then
  # shellcheck disable=SC2206
  EXTRA_ARGS=(${LIBRESPOT_ARGS})
else
  EXTRA_ARGS=()
fi

# Handle process cleanup
cleanup() {
  if [[ -n "${LIBRESPOT_PID:-}" ]] && kill -0 "${LIBRESPOT_PID}" 2>/dev/null; then
    kill -TERM "${LIBRESPOT_PID}" || true
    wait "${LIBRESPOT_PID}" || true
  fi
}
trap cleanup INT TERM

# Start librespot
echo "[entrypoint] 🎵 Démarrage de librespot sous '$DEVICE_NAME'"
librespot \
  --name "$DEVICE_NAME" \
  --backend pipe \
  --device "-" \
  --bitrate "$BITRATE" \
  --disable-audio-cache \
  "${EXTRA_ARGS[@]}" > /dev/stdout 2>&1 &
LIBRESPOT_PID=$!

# Wait a bit for librespot to register
sleep 2

# Deploy Discord commands and launch the bot
echo "[entrypoint] 🚀 Déploiement des commandes"
node deploy-commands.js

echo "[entrypoint] 🤖 Lancement du bot Discord"
exec node index.js
