const { spawn } = require("node:child_process");
const axios = require("axios");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  StreamType
} = require("@discordjs/voice");
const sessions = new Map();
const DEFAULT_DEVICE_NAME = process.env.SPOTIFY_DEVICE_NAME || "Muzika Bot";

async function getValidAccessToken(userId) {
  try {
    const database = require('../database');
    let account = await database.get_account(userId);
    if (!account || !account.refresh_token) {
      throw new Error("Aucun compte Spotify lié. Utilise `/linkspotify` pour lier ton compte.");
    }

    if (!account.access_token) {
      console.log("[voicePlayer] Rafraîchissement du token pour l'utilisateur :", userId);
      const response = await axios.post(`${process.env.BACKEND_BASE_URL}/refresh-token`, {
        refresh_token: account.refresh_token,
      });
      if (!response.data?.access_token) {
        throw new Error("Impossible de rafraîchir le token Spotify.");
      }
      account.access_token = response.data.access_token;
      await database.update_account(userId, { access_token: account.access_token });
    }

    return account.access_token;
  } catch (error) {
    console.error("[voicePlayer] Erreur lors de la récupération du token :", error.message);
    throw error;
  }
}

function startLibrespotProcess(userId) {
  return new Promise(async (resolve, reject) => {
    try {
      const accessToken = await getValidAccessToken(userId);

      const args = [
        "--name", `${DEFAULT_DEVICE_NAME} (${userId})`,
        "--backend", "pipe",
        "--device", "-",
        "--bitrate", "160",
        "--disable-audio-cache",
        "--username", userId.toString(),
        "--password", accessToken,
        "--disable-discovery",
      ];

      console.log("[voicePlayer] Démarrage de librespot avec les arguments :", args);

      const librespot = spawn("librespot", args, {
        stdio: ["ignore", "pipe", "pipe"],
      });

      librespot.stdout.on("data", (data) => {
        console.log(`[librespot stdout] ${data.toString()}`);
      });

      librespot.stderr.on("data", (data) => {
        console.error(`[librespot stderr] ${data.toString()}`);
      });

      librespot.on("error", (err) => {
        console.error("[voicePlayer] Erreur librespot :", err);
        reject(new Error("Impossible de démarrer librespot."));
      });

      librespot.on("exit", (code) => {
        console.log(`[voicePlayer] librespot terminé avec le code ${code}`);
      });

      setTimeout(() => resolve(librespot), 5000);
    } catch (error) {
      console.error("[voicePlayer] Erreur lors du démarrage de librespot :", error);
      reject(error);
    }
  });
}

async function connectAndPlay(guild, voiceChannel, userId) {
  const guildId = guild.id;
  if (sessions.has(guildId)) {
    throw new Error("Le bot est déjà connecté à un salon vocal.");
  }

  try {
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guildId,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: false,
    });

    const librespot = await startLibrespotProcess(userId);
    const ffmpeg = startFfmpegPcmToOpus();

    librespot.stdout.pipe(ffmpeg.stdin);

    const player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play,
      },
    });

    const resource = createAudioResource(ffmpeg.stdout, {
      inputType: StreamType.Opus,
    });

    player.play(resource);
    connection.subscribe(player);

    player.on(AudioPlayerStatus.Playing, () => {
      console.log("[voicePlayer] Lecture en cours");
    });

    player.on("error", (err) => {
      console.error("[voicePlayer] Erreur du player :", err);
    });

    sessions.set(guildId, { connection, player, librespot, ffmpeg });
    return { connection, player, librespot, ffmpeg };
  } catch (error) {
    console.error("[voicePlayer] Erreur dans connectAndPlay :", error);
    throw error;
  }
}

function startFfmpegPcmToOpus() {
  const ffmpeg = spawn("ffmpeg", [
    "-loglevel", "error",
    "-f", "s16le",
    "-ar", "44100",
    "-ac", "2",
    "-i", "pipe:0",
    "-f", "opus",
    "-ar", "48000",
    "-ac", "2",
    "pipe:1",
  ], {
    stdio: ["pipe", "pipe", "inherit"],
  });

  ffmpeg.on("error", (err) => {
    console.error("[voicePlayer] Erreur ffmpeg :", err);
  });

  return ffmpeg;
}

function disconnectFromGuild(guildId) {
  const session = sessions.get(guildId);
  if (!session) return;

  if (session.player) session.player.stop(true);
  if (session.connection) session.connection.destroy();
  if (session.librespot) session.librespot.kill("SIGTERM");
  if (session.ffmpeg) session.ffmpeg.kill("SIGTERM");

  sessions.delete(guildId);
}

module.exports = {
  connectAndPlay,
  disconnectFromGuild,
};
