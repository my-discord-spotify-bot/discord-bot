# Étape 1 : Compilation de librespot avec Rust 1.88
FROM rust:1.88 as builder

# Installe les dépendances pour librespot et ffmpeg
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    pkg-config \
    libssl-dev \
    libasound2-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Installe librespot 0.8.0
RUN cargo install librespot --version 0.8.0 --features "pulseaudio-backend,rodio-backend"

# Étape 2 : Image finale avec Node.js 18
FROM node:18-alpine

# Installe les dépendances système (ffmpeg, alsa, pulseaudio)
RUN apk add --no-cache ffmpeg alsa-utils pulseaudio bash

# Copie le binaire librespot depuis l'étape de build
COPY --from=builder /usr/local/cargo/bin/librespot /usr/local/bin/librespot

# Copie TOUS les fichiers du projet
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Lance le bot
CMD ["sh", "-c", "node deploy-commands.js && node index.js"]
