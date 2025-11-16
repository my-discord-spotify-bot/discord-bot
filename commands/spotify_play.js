const { SlashCommandBuilder } = require("discord.js");
const { performSpotifyRequest, handleSpotifyError } = require("../lib/spotifyApi");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("spotify_play")
    .setDescription("Lance une musique sur Spotify à partir d'une recherche.")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("Nom de la musique ou lien Spotify")
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const userId = interaction.user.id;
    const query = interaction.options.getString("query", true);

    try {
      const searchResponse = await performSpotifyRequest(userId, {
        method: "get",
        url: "https://api.spotify.com/v1/search",
        params: {
          q: query,
          type: "track",
          limit: 1,
        },
      });

      const track = searchResponse.data?.tracks?.items?.[0];

      if (!track) {
        return interaction.editReply({
          content: `Je n'ai rien trouvé pour \`${query}\`.`,
        });
      }

      await performSpotifyRequest(userId, {
        method: "put",
        url: "https://api.spotify.com/v1/me/player/play",
        data: {
          uris: [track.uri],
        },
      });

      const artists = track.artists?.map((artist) => artist.name).join(", ") || "Artiste inconnu";

      return interaction.editReply({
        content: `▶️ Lecture lancée : **${track.name}** — ${artists}`,
      });
    } catch (error) {
      return handleSpotifyError(
        interaction,
        error,
        "❌ Impossible de lancer la lecture sur Spotify."
      );
    }
  },
};
