const fs = require("node:fs");
const path = require("node:path");
const { Client, Collection, GatewayIntentBits, Events } = require("discord.js");
const { spawn } = require('child_process');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');

// Initialise le client Discord
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});
client.commands = new Collection();

// Map pour stocker les sessions librespot par guild
const guildPlayers = new Map();

// Fonction pour démarrer librespot avec le token de l'utilisateur
async function startLibrespot(guildId, channel, userId) {
  if (guildPlayers.has(guildId)) {
    return; // Une session existe déjà pour cette guild
  }

  try {
    // Récupère le token Spotify depuis la base de données
    const database = require('./database');
    const account = await database.get_account(userId.toString());

    if (!account || !account.access_token) {
      throw new Error("❌ Aucun compte Spotify lié. Utilise `/link` pour lier ton compte.");
    }

    // Rejoint le salon vocal
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guildId,
      adapterCreator: channel.guild.voiceAdapterCreator,
    });

    const audioPlayer = createAudioPlayer();
    connection.subscribe(audioPlayer);

    // Démarre librespot avec le token OAuth
    const librespotProcess = spawn('librespot', [
      '--name', `Muzika Bot (${channel.guild.name})`,
      '--backend', 'pipe',
      '--device', 'pipe.sink',
      '--bitrate', '160',
      '--disable-audio-cache',
      '--enable-volume-normalisation',
      '--username', userId.toString(),
      '--password', account.access_token,
    ]);

    // Démarre ffmpeg pour convertir le flux audio
    const ffmpeg = spawn('ffmpeg', [
      '-i', 'pipe:0',
      '-f', 's16le',
      '-ar', '48000',
      '-ac', '2',
      'pipe:1',
    ]);

    // Pipe : librespot → ffmpeg → AudioPlayer
    librespotProcess.stdout.pipe(ffmpeg.stdin);
    const audioResource = createAudioResource(ffmpeg.stdout, { inputType: 'raw' });
    audioPlayer.play(audioResource);

    // Stocke les références
    guildPlayers.set(guildId, { librespotProcess, audioPlayer, connection });

    // Gestion des erreurs
    librespotProcess.stderr.on('data', (data) => {
      console.error(`[Guild ${guildId}] librespot error: ${data}`);
    });

    ffmpeg.stderr.on('data', (data) => {
      console.error(`[Guild ${guildId}] ffmpeg error: ${data}`);
    });

    librespotProcess.on('error', (err) => {
      console.error(`[Guild ${guildId}] librespot process error:`, err);
      stopLibrespot(guildId);
    });

    ffmpeg.on('error', (err) => {
      console.error(`[Guild ${guildId}] ffmpeg process error:`, err);
      stopLibrespot(guildId);
    });

    librespotProcess.on('close', (code) => {
      console.log(`[Guild ${guildId}] librespot process exited with code ${code}`);
      stopLibrespot(guildId);
    });

    ffmpeg.on('close', (code) => {
      console.log(`[Guild ${guildId}] ffmpeg process exited with code ${code}`);
      stopLibrespot(guildId);
    });

  } catch (error) {
    console.error(`[Guild ${guildId}] Error in startLibrespot:`, error);
    throw error;
  }
}

// Fonction pour arrêter librespot
function stopLibrespot(guildId) {
  const player = guildPlayers.get(guildId);
  if (player) {
    player.librespotProcess.kill();
    player.audioPlayer.stop();
    player.connection.destroy();
    guildPlayers.delete(guildId);
  }
}

// Ajoute les fonctions au client pour les utiliser dans les commandes
client.startLibrespot = startLibrespot;
client.stopLibrespot = stopLibrespot;

// Chargement dynamique des commandes
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`[index] La commande ${filePath} n'a pas de propriété "data" ou "execute".`);
  }
}

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
