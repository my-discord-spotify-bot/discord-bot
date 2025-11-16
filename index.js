const fs = require("node:fs");
const path = require("node:path");
const { Client, Collection, GatewayIntentBits, Events } = require("discord.js");
const { connectAndPlay, disconnectFromGuild } = require('./voicePlayer');

// Initialise le client Discord
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});
client.commands = new Collection();

// Chargement dynamique des commandes
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`[index] La commande ${filePath} manque "data" ou "execute".`);
  }
}

// Ajoute les fonctions de voicePlayer au client APRES l'initialisation
client.connectAndPlay = connectAndPlay;
client.disconnectFromGuild = disconnectFromGuild;

// Événement : Bot prêt
client.once(Events.ClientReady, (c) => {
  console.log(`✅ Bot connecté en tant que ${c.user.tag}`);
});

// Événement : Interaction créée
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    console.error(`[index] Aucune commande correspondant à ${interaction.commandName} n'a été trouvée.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`[index] Erreur lors de l'exécution de la commande :`, error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "❌ Une erreur est survenue lors de l'exécution de la commande.",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "❌ Une erreur est survenue lors de l'exécution de la commande.",
        ephemeral: true,
      });
    }
  }
});

// Connexion du bot avec le token depuis les variables d'environnement
client.login(process.env.DISCORD_TOKEN);
