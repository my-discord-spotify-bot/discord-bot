# Builder stage
FROM rust:1.88 AS builder

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

# Installe librespot
RUN cargo install librespot --version 0.8.0 --features "pulseaudio-backend,rodio-backend"

# Runtime stage
FROM node:18-bullseye

# Installe les dépendances système nécessaires
RUN apt-get update && apt-get install -y \
    ffmpeg \
    alsa-utils \
    pulseaudio \
    libssl1.1 \
    libasound2 \
    libpulse0 \
    && rm -rf /var/lib/apt/lists/*

# Copie le binaire librespot depuis l'étape de build
COPY --from=builder /usr/local/cargo/bin/librespot /usr/local/bin/

# Rend le binaire exécutable
RUN chmod +x /usr/local/bin/librespot

# Vérifie que librespot est bien installé
RUN ldd /usr/local/bin/librespot && \
    librespot --version

WORKDIR /app

# Copie les fichiers de configuration de npm et installe les dépendances
COPY package*.json ./
RUN npm install

# Copie le reste des fichiers du projet
COPY . .

# Lance le bot
CMD ["sh", "-c", "node deploy-commands.js && node index.js"]
