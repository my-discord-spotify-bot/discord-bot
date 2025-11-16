const fs = require("node:fs");
const path = require("node:path");
const { Client, Collection, GatewayIntentBits, Events } = require("discord.js");

// Vérification du module voicePlayer
let connectAndPlay, disconnectFromGuild;
try {
  const voicePlayerPath = require.resolve('./lib/voicePlayer');
  console.log(`[index] Module voicePlayer trouvé : ${voicePlayerPath}`);
  ({ connectAndPlay, disconnectFromGuild } = require('./lib/voicePlayer'));
} catch (err) {
  console.error("[index] Erreur lors du chargement de voicePlayer :", err);
  process.exit(1);
}

// Initialisation du client Discord
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});
client.commands = new Collection();

// Chargement dynamique des commandes
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  try {
    const command = require(filePath);
    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
    } else {
      console.warn(`[index] La commande ${filePath} manque "data" ou "execute".`);
    }
  } catch (error) {
    console.error(`[index] Erreur lors du chargement de la commande ${filePath} :`, error);
  }
}

// Ajout des fonctions de voicePlayer au client
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
    console.error(`[index] Commande introuvable : ${interaction.commandName}`);
    return interaction.reply({
      content: "❌ Cette commande n'existe pas.",
      ephemeral: true,
    });
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`[index] Erreur lors de l'exécution de la commande ${interaction.commandName} :`, error);
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

// Connexion du bot
try {
  client.login(process.env.DISCORD_TOKEN);
} catch (error) {
  console.error("[index] Erreur lors de la connexion du bot :", error);
  process.exit(1);
}
