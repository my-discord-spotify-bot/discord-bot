# ---------- STAGE 1 : build de librespot ----------
FROM rust:1.82-slim AS librespot-builder

RUN apt-get update && apt-get install -y \
    pkg-config \
    libasound2-dev \
    build-essential \
 && rm -rf /var/lib/apt/lists/*

# Installe le binaire librespot dans /usr/local/cargo/bin/librespot
RUN cargo install librespot

# ---------- STAGE 2 : image finale Node + ffmpeg + librespot ----------
FROM node:18

WORKDIR /app

# Copie du package.json du bot
COPY package*.json ./

# Dépendances Node
RUN npm install

# Copie du code du bot
COPY . .

# Copie du binaire librespot construit dans le 1er stage
COPY --from=librespot-builder /usr/local/cargo/bin/librespot /usr/local/bin/librespot

# ffmpeg pour convertir le flux audio
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

CMD ["npm", "start"]
