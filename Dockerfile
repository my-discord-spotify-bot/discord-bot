# Étape 1 : Compilation de librespot avec Rust
FROM rust:1.88 as builder

# Installe les dépendances pour librespot
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

# Installe les dépendances système nécessaires
RUN apk add --no-cache \
    ffmpeg \
    alsa-utils \
    pulseaudio \
    bash \
    libstdc++

# Copie le binaire librespot depuis l'étape de build
COPY --from=builder /usr/local/cargo/bin/librespot /usr/local/bin/

# Rend le binaire exécutable
RUN chmod +x /usr/local/bin/librespot

# Vérifie que librespot est bien installé
RUN which librespot && librespot --version

# Crée et utilise le répertoire de travail
WORKDIR /app

# Copie les fichiers de configuration de npm et installe les dépendances
COPY package*.json ./
RUN npm install

# Copie le reste des fichiers du projet
COPY . .

# Lance le bot
CMD ["sh", "-c", "node deploy-commands.js && node index.js"]
