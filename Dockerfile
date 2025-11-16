# ---- Stage 1: build librespot -------------------------------------------------
# We compile librespot once to keep the final runtime image light.
FROM rust:1.86-bookworm AS librespot-builder

WORKDIR /build

# Install only what is needed to compile librespot.
RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    libasound2-dev \
 && rm -rf /var/lib/apt/lists/*

# Build librespot with the audio backends required by Discord voice.
RUN cargo install librespot --locked --features "pulseaudio-backend,rodio-backend,alsa-backend"

# ---- Stage 2: runtime ---------------------------------------------------------
# Based on the official Node.js 18 image so Node is installed cleanly.
FROM node:18-bookworm-slim AS runtime

# System dependencies needed for ffmpeg + PulseAudio/ALSA in Discord voice.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libasound2 \
    libpulse0 \
    pulseaudio \
    alsa-utils \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Copy the librespot binary built in the previous stage.
COPY --from=librespot-builder /usr/local/cargo/bin/librespot /usr/local/bin/librespot
RUN chmod +x /usr/local/bin/librespot

WORKDIR /usr/src/app

# Install Node.js dependencies separately to leverage Docker layer caching.
COPY package*.json ./
RUN npm install --omit=dev

# Copy the rest of the bot source code.
COPY . .

# Install the entrypoint script that will launch librespot + the bot together.
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Ensure files are owned by the non-root "node" user already provided by the base image.
RUN chown -R node:node /usr/src/app
USER node

# Default configuration for librespot; can be overridden at runtime.
ENV SPOTIFY_DEVICE_NAME="Muzika Bot" \
    SPOTIFY_BITRATE="160" \
    LIBRESPOT_ARGS=""

# Launch librespot in the background, then the Discord bot.
CMD ["/usr/local/bin/docker-entrypoint.sh"]
