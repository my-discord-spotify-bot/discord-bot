const { SlashCommandBuilder } = require("discord.js");
const { performSpotifyRequest, handleSpotifyError } = require("../lib/spotifyApi");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("spotify_pause")
    .setDescription("Met en pause la lecture Spotify en cours."),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const userId = interaction.user.id;

    try {
      await performSpotifyRequest(userId, {
        method: "put",
        url: "https://api.spotify.com/v1/me/player/pause",
      });

      return interaction.editReply({
        content: "⏸️ Lecture Spotify mise en pause.",
      });
    } catch (error) {
      return handleSpotifyError(
        interaction,
        error,
        "❌ Impossible de mettre la lecture en pause."
      );
    }
  },
};
