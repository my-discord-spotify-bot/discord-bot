const { SlashCommandBuilder } = require("discord.js");
const axios = require("axios");
const { backendBaseUrl } = require("../config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("checkspotify")
    .setDescription("Vérifie si ton compte Spotify est bien lié au bot."),

  async execute(interaction) {
    const userId = interaction.user.id;

    try {
      const url = `${backendBaseUrl}/get-token?code=${encodeURIComponent(
        userId
      )}`;

      const response = await axios.get(url);

      if (!response.data || !response.data.access_token) {
        return interaction.reply({
          content:
            "Je n'ai pas trouvé de compte Spotify lié à ton profil. Utilise d'abord `/linkspotify`.",
          ephemeral: true,
        });
      }

      return interaction.reply({
        content:
          "✅ Ton compte Spotify est bien lié ! Le bot peut maintenant agir en ton nom (selon les permissions accordées).",
        ephemeral: true,
      });
    } catch (err) {
      if (err.response && err.response.status === 404) {
        return interaction.reply({
          content:
            "Je n'ai pas trouvé de compte Spotify lié à ton profil. Utilise d'abord `/linkspotify`.",
          ephemeral: true,
        });
      }

      console.error("Erreur lors de /checkspotify:", err.response?.data || err);
      return interaction.reply({
        content:
          "❌ Erreur lors de la vérification de ton lien Spotify. Réessaie plus tard.",
        ephemeral: true,
      });
    }
  },
};
