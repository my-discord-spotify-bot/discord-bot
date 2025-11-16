# Builder stage
FROM --platform=linux/amd64 rust:1.88 AS builder

WORKDIR /app

# Installe les dépendances nécessaires pour la compilation
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    pkg-config \
    libssl-dev \
    libasound2-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Installe librespot pour les architectures x86_64 et aarch64
RUN rustup target add x86_64-unknown-linux-gnu aarch64-unknown-linux-gnu

# Compile librespot pour x86_64
RUN cargo install librespot --version 0.8.0 --features "pulseaudio-backend,rodio-backend" --target=x86_64-unknown-linux-gnu

# Compile librespot pour aarch64
RUN RUSTFLAGS="-C linker=aarch64-linux-gnu-gcc" cargo install librespot --version 0.8.0 --features "pulseaudio-backend,rodio-backend" --target=aarch64-unknown-linux-gnu

# Copie les binaires compilés
RUN mkdir /app/bin && \
    cp /usr/local/cargo/bin/librespot /app/bin/x86_64 && \
    cp /root/.cargo/bin/aarch64-unknown-linux-gnu/release/librespot /app/bin/aarch64

# Runtime stage
FROM node:18-bullseye

ARG TARGETPLATFORM=linux/amd64
ENV TARGETPLATFORM=${TARGETPLATFORM}

# Installe les dépendances système nécessaires
RUN apt-get update && apt-get install -y \
    ffmpeg \
    alsa-utils \
    pulseaudio \
    libssl3 \
    libasound2 \
    libpulse0 \
    && rm -rf /var/lib/apt/lists/*

# Copie le binaire approprié pour l'architecture cible
COPY --from=builder /app/bin/x86_64 /usr/local/bin/librespot-x86_64
COPY --from=builder /app/bin/aarch64 /usr/local/bin/librespot-aarch64

# Crée un script pour choisir le bon binaire en fonction de l'architecture
RUN echo '#!/bin/sh\n\
if [ "$(uname -m)" = "x86_64" ]; then\n\
    exec /usr/local/bin/librespot-x86_64 "$@"\n\
elif [ "$(uname -m)" = "aarch64" ]; then\n\
    exec /usr/local/bin/librespot-aarch64 "$@"\n\
else\n\
    echo "Unsupported architecture: $(uname -m)" >&2\n\
    exit 1\n\
fi' > /usr/local/bin/librespot && \
    chmod +x /usr/local/bin/librespot

# Vérifie que librespot est bien installé
RUN ldd /usr/local/bin/librespot-x86_64 && \
    ldd /usr/local/bin/librespot-aarch64 && \
    /usr/local/bin/librespot --version

WORKDIR /app

# Copie les fichiers de configuration de npm et installe les dépendances
COPY package*.json ./
RUN npm install

# Copie le reste des fichiers du projet
COPY . .

# Lance le bot
CMD ["sh", "-c", "node deploy-commands.js && node index.js"]
