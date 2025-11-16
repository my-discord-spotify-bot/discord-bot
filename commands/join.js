const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Rejoint le salon vocal et active Muzika Bot comme device Spotify'),
  async execute(interaction) {
    const { member, guild } = interaction;

    if (!member.voice.channel) {
      return interaction.reply({
        content: "❌ Tu dois être dans un salon vocal !",
        ephemeral: true,
      });
    }

    try {
      await interaction.deferReply({ ephemeral: true });
      await interaction.client.connectAndPlay(guild, member.voice.channel);
      await interaction.editReply({
        content: "✅ **Muzika Bot** est prêt ! Sélectionne-le comme device dans Spotify.",
      });
    } catch (error) {
      console.error("Erreur dans /join:", error);
      await interaction.editReply({
        content: error.message || "❌ Une erreur est survenue lors de la connexion à Spotify.",
        ephemeral: true,
      });
    }
  },
};
