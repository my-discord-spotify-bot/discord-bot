const { spawn } = require("node:child_process");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  StreamType,
} = require("@discordjs/voice");

const sessions = new Map(); // guildId -> { connection, player, librespot, ffmpeg }

function startLibrespotProcess() {
  const username = process.env.BOT_SPOTIFY_USERNAME;
  const password = process.env.BOT_SPOTIFY_PASSWORD;
  const deviceName = process.env.BOT_SPOTIFY_DEVICE_NAME || "Muzika Bot";

  if (!username || !password) {
    console.error("[voicePlayer] BOT_SPOTIFY_USERNAME / BOT_SPOTIFY_PASSWORD manquants");
    throw new Error("Missing Spotify bot credentials");
  }

  const args = [
    "--name",
    deviceName,
    "--backend",
    "pipe",
    "--device",
    "-",
    "--bitrate",
    "160",
    "--disable-audio-cache",
    "--username",
    username,
    "--password",
    password,
  ];

  console.log("[voicePlayer] Lancement de librespot :", args.join(" "));
  const librespot = spawn("librespot", args, {
    stdio: ["ignore", "pipe", "inherit"],
  });

  librespot.on("exit", (code, signal) => {
    console.log(`[voicePlayer] librespot terminé (code=${code}, signal=${signal})`);
  });

  return librespot;
}

function startFfmpegPcmToOpus() {
  const ffmpegArgs = [
    "-loglevel",
    "error",
    "-f",
    "s16le",
    "-ar",
    "44100",
    "-ac",
    "2",
    "-i",
    "pipe:0",
    "-f",
    "opus",
    "-ar",
    "48000",
    "-ac",
    "2",
    "pipe:1",
  ];

  const ffmpeg = spawn("ffmpeg", ffmpegArgs, {
    stdio: ["pipe", "pipe", "inherit"],
  });

  ffmpeg.on("exit", (code, signal) => {
    console.log(`[voicePlayer] ffmpeg terminé (code=${code}, signal=${signal})`);
  });

  return ffmpeg;
}

async function connectAndPlay(guild, voiceChannel) {
  const guildId = guild.id;

  const existing = sessions.get(guildId);
  if (existing) return existing;

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: guildId,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: false,
  });

  const librespot = startLibrespotProcess();
  const ffmpeg = startFfmpegPcmToOpus();

  librespot.stdout.pipe(ffmpeg.stdin);

  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Play,
    },
  });

  const resource = createAudioResource(ffmpeg.stdout, {
    inputType: StreamType.OggOpus,
  });

  player.play(resource);
  connection.subscribe(player);

  player.on(AudioPlayerStatus.Playing, () => {
    console.log("[voicePlayer] AudioPlayer Playing");
  });

  player.on("error", (err) => {
    console.error("[voicePlayer] AudioPlayer error:", err);
  });

  sessions.set(guildId, { connection, player, librespot, ffmpeg });

  return { connection, player, librespot, ffmpeg };
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
