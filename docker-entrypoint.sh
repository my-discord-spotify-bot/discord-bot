#!/usr/bin/env bash
set -euo pipefail

DEVICE_NAME="${SPOTIFY_DEVICE_NAME:-Muzika Bot}"
BITRATE="${SPOTIFY_BITRATE:-160}"

# Allow users to pass arbitrary librespot arguments via LIBRESPOT_ARGS.
if [[ -n "${LIBRESPOT_ARGS:-}" ]]; then
  # shellcheck disable=SC2206
  EXTRA_ARGS=(${LIBRESPOT_ARGS})
else
  EXTRA_ARGS=()
fi

cleanup() {
  if [[ -n "${NODE_PID:-}" ]] && kill -0 "${NODE_PID:-}" 2>/dev/null; then
    kill -TERM "${NODE_PID:-}" 2>/dev/null || true
    wait "${NODE_PID:-}" 2>/dev/null || true
  fi

  if [[ -n "${LIBRESPOT_PID:-}" ]] && kill -0 "${LIBRESPOT_PID:-}" 2>/dev/null; then
    kill -TERM "${LIBRESPOT_PID:-}" 2>/dev/null || true
    wait "${LIBRESPOT_PID:-}" 2>/dev/null || true
  fi
}

trap cleanup INT TERM

echo "[entrypoint] Starting librespot device '$DEVICE_NAME'"
librespot \
  --name "$DEVICE_NAME" \
  --backend pipe \
  --device "-" \
  --bitrate "$BITRATE" \
  --disable-audio-cache \
  "${EXTRA_ARGS[@]}" &
LIBRESPOT_PID=$!

# Ensure librespot has time to authenticate before the bot joins voice channels.
sleep 2

echo "[entrypoint] Deploying slash commands"
node deploy-commands.js

echo "[entrypoint] Launching Discord bot"
node index.js &
NODE_PID=$!
wait "$NODE_PID"
EXIT_CODE=$?
NODE_PID=""
cleanup
exit "$EXIT_CODE"
