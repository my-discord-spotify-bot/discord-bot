const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { performSpotifyRequest, handleSpotifyError } = require("../lib/spotifyApi");

function formatDeviceLine(device) {
  const statusEmoji = device.is_active ? "🟢" : "⚪️";
  const restricted = device.is_restricted ? " (restreint)" : "";
  const privateSession = device.is_private_session ? " — session privée" : "";
  const volume =
    typeof device.volume_percent === "number" ? ` — ${device.volume_percent}% de volume` : "";

  return `${statusEmoji} **${device.name || "Appareil inconnu"}** (${device.type || "type inconnu"})${restricted}${privateSession}${volume}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("spotify_devices")
    .setDescription("Liste les appareils disponibles pour Spotify."),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const userId = interaction.user.id;

    try {
      const response = await performSpotifyRequest(userId, {
        method: "get",
        url: "https://api.spotify.com/v1/me/player/devices",
      });

      const devices = response.data?.devices || [];

      if (!devices.length) {
        return interaction.editReply({
          content: "Spotify n'a retourné aucun appareil disponible.",
        });
      }

      const description = devices.map((device) => formatDeviceLine(device)).join("\n");

      const embed = new EmbedBuilder()
        .setColor(0x1db954)
        .setTitle("Appareils Spotify disponibles")
        .setDescription(description.slice(0, 4096));

      return interaction.editReply({
        embeds: [embed],
      });
    } catch (error) {
      return handleSpotifyError(
        interaction,
        error,
        "❌ Impossible de récupérer la liste des appareils Spotify."
      );
    }
  },
};
