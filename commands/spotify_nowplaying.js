const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { performSpotifyRequest, handleSpotifyError } = require("../lib/spotifyApi");

function formatDuration(ms = 0) {
  if (!ms || ms <= 0) {
    return "0:00";
  }

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function buildProgressBar(current = 0, total = 1, size = 12) {
  if (!total || total <= 0) {
    return "────────";
  }

  const ratio = Math.min(Math.max(current / total, 0), 1);
  const progressUnits = Math.max(1, Math.round(ratio * size));
  const remainingUnits = size - progressUnits;

  return `${"▰".repeat(progressUnits)}${"▱".repeat(Math.max(0, remainingUnits))}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("spotify_nowplaying")
    .setDescription("Affiche la musique en cours sur ton compte Spotify."),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const userId = interaction.user.id;

    try {
      const response = await performSpotifyRequest(userId, {
        method: "get",
        url: "https://api.spotify.com/v1/me/player/currently-playing",
      });

      if (response.status === 204 || !response.data || !response.data.item) {
        return interaction.editReply({
          content: "Aucune lecture Spotify en cours en ce moment.",
        });
      }

      const { item, device, is_playing, progress_ms } = response.data;
      const artists = item.artists?.map((artist) => artist.name).join(", ") || "Artiste inconnu";
      const album = item.album?.name || "Album inconnu";
      const albumArt = item.album?.images?.[0]?.url || null;
      const duration = item.duration_ms || 0;

      const embed = new EmbedBuilder()
        .setColor(0x1db954)
        .setTitle(item.name)
        .setURL(item.external_urls?.spotify || null)
        .setDescription(`par **${artists}**\nAlbum : ${album}`)
        .addFields(
          { name: "Appareil", value: device?.name || "Inconnu", inline: true },
          { name: "Lecture", value: is_playing ? "▶️ En cours" : "⏸️ En pause", inline: true }
        );

      if (albumArt) {
        embed.setThumbnail(albumArt);
      }

      if (duration > 0) {
        const progressBar = buildProgressBar(progress_ms || 0, duration);
        embed.addFields({
          name: "Progression",
          value: `${progressBar}\n${formatDuration(progress_ms || 0)} / ${formatDuration(duration)}`,
        });
      }

      return interaction.editReply({
        content: "🎧 Lecture actuelle :",
        embeds: [embed],
      });
    } catch (error) {
      return handleSpotifyError(
        interaction,
        error,
        "❌ Impossible de récupérer la lecture en cours."
      );
    }
  },
};
