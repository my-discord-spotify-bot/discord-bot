const { SlashCommandBuilder } = require("discord.js");
const axios = require("axios");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("checkspotify")
    .setDescription("Vérifie si ton compte Spotify est bien lié au bot."),
  async execute(interaction) {
    const userId = interaction.user.id;
    const backendBaseUrl = process.env.BACKEND_BASE_URL; // Utilise la variable d'environnement

    try {
      const url = `${backendBaseUrl}/get-token?code=${encodeURIComponent(userId)}`;
      const response = await axios.get(url);

      if (!response.data || !response.data.access_token) {
        return interaction.reply({
          content: "❌ Aucun compte Spotify lié. Utilise `/linkspotify` pour lier ton compte.",
          ephemeral: true,
        });
      }

      return interaction.reply({
        content: "✅ Ton compte Spotify est bien lié !",
        ephemeral: true,
      });
    } catch (err) {
      console.error("Erreur /checkspotify:", err.response?.data || err.message);
      return interaction.reply({
        content: err.response?.status === 404
          ? "❌ Aucun compte Spotify lié. Utilise `/linkspotify`."
          : "❌ Erreur lors de la vérification. Réessaie plus tard.",
        ephemeral: true,
      });
    }
  },
};
