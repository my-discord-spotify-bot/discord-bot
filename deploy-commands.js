const fs = require("node:fs");
const path = require("node:path");
const { REST, Routes } = require("discord.js");

// Récupère les variables d'environnement
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId || !guildId) {
  console.error("[deploy-commands] Variables d'environnement manquantes : DISCORD_TOKEN, DISCORD_CLIENT_ID, ou DISCORD_GUILD_ID");
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ("data" in command && "execute" in command) {
    commands.push(command.data.toJSON());
  } else {
    console.warn(`[deploy-commands] La commande ${filePath} manque "data" ou "execute".`);
  }
}

const rest = new REST({ version: "10" }).setToken(token);

async function main() {
  try {
    console.log(`[deploy-commands] Déploiement de ${commands.length} commande(s) sur le serveur ${guildId}...`);
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );
    console.log("[deploy-commands] ✅ Déploiement terminé !");
  } catch (error) {
    console.error("[deploy-commands] ❌ Erreur lors du déploiement :", error);
  }
}

main();
