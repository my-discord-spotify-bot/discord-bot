require("dotenv").config();

const {
  DISCORD_TOKEN,
  DISCORD_CLIENT_ID,
  DISCORD_GUILD_ID,
  BACKEND_BASE_URL,
} = process.env;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID || !DISCORD_GUILD_ID || !BACKEND_BASE_URL) {
  console.warn(
    "[config] ⚠️ Il manque une ou plusieurs variables d'environnement. Vérifie ton fichier .env"
  );
}

module.exports = {
  token: DISCORD_TOKEN,
  clientId: DISCORD_CLIENT_ID,
  guildId: DISCORD_GUILD_ID,
  // on enlève un éventuel / à la fin pour éviter les doublons
  backendBaseUrl: BACKEND_BASE_URL.replace(/\/$/, ""),
};
