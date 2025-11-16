const fs = require("node:fs");
const path = require("node:path");
const { REST, Routes } = require("discord.js");

// Récupère les variables depuis process.env
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID; // Optionnel si tu veux déployer sur un serveur spécifique

const commands = [];
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ("data" in command && "execute" in command) {
    commands.push(command.data.toJSON());
  } else {
    console.warn(`[deploy-commands] La commande à ${filePath} manque "data" ou "execute".`);
  }
}

const rest = new REST({ version: "10" }).setToken(token);

async function main() {
  try {
    console.log(`[deploy-commands] Déploiement de ${commands.length} commande(s)...`);
    await rest.put(
      guildId
        ? Routes.applicationGuildCommands(clientId, guildId) // Déploiement sur un serveur spécifique
        : Routes.applicationCommands(clientId), // Déploiement global
      { body: commands }
    );
    console.log("[deploy-commands] ✅ Déploiement terminé !");
  } catch (error) {
    console.error("[deploy-commands] ❌ Erreur lors du déploiement :", error);
  }
}

main();
