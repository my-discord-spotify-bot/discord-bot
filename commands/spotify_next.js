const { SlashCommandBuilder } = require("discord.js");
const { performSpotifyRequest, handleSpotifyError } = require("../lib/spotifyApi");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("spotify_next")
    .setDescription("Passe à la musique suivante sur Spotify."),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const userId = interaction.user.id;

    try {
      await performSpotifyRequest(userId, {
        method: "post",
        url: "https://api.spotify.com/v1/me/player/next",
      });

      return interaction.editReply({
        content: "⏭️ Titre suivant lancé sur Spotify.",
      });
    } catch (error) {
      return handleSpotifyError(
        interaction,
        error,
        "❌ Impossible de passer à la musique suivante."
      );
    }
  },
};
