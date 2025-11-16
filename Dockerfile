# Étape 1 : Construction de librespot avec Rust 1.85
FROM rust:1.85 as builder

# Installe les dépendances pour compiler librespot
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    pkg-config \
    libssl-dev \
    libasound2-dev \
    && rm -rf /var/lib/apt/lists/*

# Installe librespot 0.8.0
RUN cargo install librespot --version 0.8.0

# Étape 2 : Image finale avec Node.js
FROM node:18-alpine

# Installe ffmpeg et les dépendances audio
RUN apk add --no-cache ffmpeg alsa-utils

# Copie le binaire librespot depuis l'étape de build
COPY --from=builder /usr/local/cargo/bin/librespot /usr/local/bin/librespot

# Configure ton application
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Commande pour lancer ton application (à adapter)
CMD ["npm", "start"]
