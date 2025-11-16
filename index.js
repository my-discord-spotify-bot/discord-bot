const { spawn } = require('child_process');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');

// Map pour stocker les sessions librespot par guild
const guildPlayers = new Map();

// Fonction pour démarrer librespot avec le token de l'utilisateur
async function startLibrespot(guildId, channel, userId) {
  if (guildPlayers.has(guildId)) {
    return; // Une session existe déjà pour cette guild
  }

  // Récupère le token Spotify depuis ta base de données
  const database = require('./database'); // Adapte le chemin selon ton projet
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

  // Démarre librespot avec le token OAuth de l'utilisateur
  const librespotProcess = spawn('librespot', [
    '--name', `Muzika Bot (${channel.guild.name})`,
    '--backend', 'pipe',
    '--device', 'pipe.sink',
    '--bitrate', '160',
    '--disable-audio-cache',
    '--enable-volume-normalisation',
  ], {
    env: { ...process.env, RSPOTIFY_CREDENTIALS: account.access_token },
  });

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
