const { SlashCommandBuilder } = require("discord.js");
const { performSpotifyRequest, handleSpotifyError } = require("../lib/spotifyApi");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("spotify_prev")
    .setDescription("Revient à la musique précédente sur Spotify."),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const userId = interaction.user.id;

    try {
      await performSpotifyRequest(userId, {
        method: "post",
        url: "https://api.spotify.com/v1/me/player/previous",
      });

      return interaction.editReply({
        content: "⏮️ Musique précédente relancée sur Spotify.",
      });
    } catch (error) {
      return handleSpotifyError(
        interaction,
        error,
        "❌ Impossible de revenir à la musique précédente."
      );
    }
  },
};
