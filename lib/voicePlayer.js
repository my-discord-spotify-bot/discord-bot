const { spawn } = require("node:child_process");
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

function startLibrespotProcess(userId, accessToken) {
  return new Promise((resolve, reject) => {
    try {
      if (!accessToken) {
        throw new Error("OAuth access token is required. User must link their Spotify account first.");
      }

      const args = [
        "--name", `${DEFAULT_DEVICE_NAME} ${userId}`,
        "--backend", "pipe",
        "--device", "-",
        "--bitrate", "320",
        "--enable-volume-normalisation",
        "--initial-volume", "100",
        "--token", accessToken,
      ];

      const librespotProcess = spawn("librespot", args);
      const processInfo = {
        process: librespotProcess,
        stdout: librespotProcess.stdout,
        stderr: librespotProcess.stderr,
        pid: librespotProcess.pid,
        startTime: Date.now(),
        userId
      };

      sessions.set(userId, processInfo);

      let hasResolved = false;
      let errorOutput = "";

      librespotProcess.stderr.on("data", (data) => {
        const message = data.toString();
        errorOutput += message;
        console.error(`[librespot stderr] ${message}`);

        if (!hasResolved && (message.includes("Using device") || message.includes("Country:"))) {
          hasResolved = true;
          resolve(processInfo);
        }
      });

      librespotProcess.on("error", (error) => {
        console.error(`[librespot error] Failed to start process:`, error);
        sessions.delete(userId);
        if (!hasResolved) {
          hasResolved = true;
          reject(new Error(`Failed to start librespot: ${error.message}`));
        }
      });

      librespotProcess.on("exit", (code, signal) => {
        console.log(`[librespot] Process exited with code ${code} and signal ${signal}`);
        sessions.delete(userId);
        if (!hasResolved) {
          hasResolved = true;
          reject(new Error(`Librespot exited unexpectedly (code: ${code}, signal: ${signal}). Error output: ${errorOutput}`));
        }
      });

      setTimeout(() => {
        if (!hasResolved) {
          hasResolved = true;
          resolve(processInfo);
        }
      }, 5000);
    } catch (error) {
      console.error("[startLibrespotProcess] Error:", error);
      reject(error);
    }
  });
}

function stopLibrespotProcess(userId) {
  const session = sessions.get(userId);
  if (session) {
    try {
      session.process.kill("SIGTERM");
      sessions.delete(userId);
      console.log(`[voicePlayer] Stopped librespot process for user ${userId}`);
    } catch (error) {
      console.error(`[voicePlayer] Error stopping process for user ${userId}:`, error);
    }
  }
}

function createPlayer(userId) {
  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Pause
    }
  });

  player.on(AudioPlayerStatus.Playing, () => {
    console.log(`[player ${userId}] Playing audio`);
  });

  player.on(AudioPlayerStatus.Idle, () => {
    console.log(`[player ${userId}] Idle`);
  });

  player.on("error", (error) => {
    console.error(`[player ${userId}] Error:`, error);
  });

  return player;
}

async function joinAndPlay(guildId, channelId, userId, accessToken) {
  try {
    console.log(`[joinAndPlay] Starting for user ${userId} in channel ${channelId}`);

    const processInfo = await startLibrespotProcess(userId, accessToken);
    console.log(`[joinAndPlay] Librespot started with PID ${processInfo.pid}`);

    const connection = joinVoiceChannel({
      channelId,
      guildId,
      adapterCreator: null,
      selfDeaf: false
    });

    const player = createPlayer(userId);
    const resource = createAudioResource(processInfo.stdout, {
      inputType: StreamType.Raw
    });

    player.play(resource);
    connection.subscribe(player);

    console.log(`[joinAndPlay] Successfully joined voice channel and started playing`);

    return {
      connection,
      player,
      processInfo
    };
  } catch (error) {
    console.error(`[joinAndPlay] Error:`, error);
    stopLibrespotProcess(userId);
    throw error;
  }
}

function cleanup(userId) {
  stopLibrespotProcess(userId);
}

module.exports = {
  joinAndPlay,
  cleanup,
  sessions
};
