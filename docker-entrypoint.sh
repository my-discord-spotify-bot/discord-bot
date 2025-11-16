#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${SPOTIFY_BOT_EMAIL:-}" || -z "${SPOTIFY_BOT_PASSWORD:-}" ]]; then
  echo "[entrypoint] ❌ Les variables SPOTIFY_BOT_EMAIL et SPOTIFY_BOT_PASSWORD doivent être définies."
  exit 1
fi

start_pulseaudio() {
  echo "[entrypoint] 🔊 Initialisation de PulseAudio (dummy sink)"
  if pulseaudio --check 2>/dev/null; then
    echo "[entrypoint] PulseAudio est déjà démarré"
    return
  fi

  pulseaudio --start --disallow-exit --exit-idle-time=-1 -L "module-null-sink sink_name=DiscordBot" >/tmp/pulseaudio.log 2>&1 || {
    cat /tmp/pulseaudio.log >&2
    echo "[entrypoint] ❌ Impossible de démarrer PulseAudio"
    exit 1
  }
}

start_pulseaudio

echo "[entrypoint] 🤖 Lancement du bot Discord"
exec node index.js
