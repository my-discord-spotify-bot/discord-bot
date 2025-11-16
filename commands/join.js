const { SlashCommandBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Rejoint le salon vocal et active Muzika Bot comme device Spotify'),
  async execute(interaction) {
    const { member, guild, user } = interaction;

    if (!member.voice.channel) {
      return interaction.reply({ content:"❌ Tu dois être dans un salon vocal !", ephemeral: true });
    }

    if (guild.members.me?.voice?.channelId && guild.members.me.voice.channelId !== member.voice.channelId) {
      return interaction.reply({
        content: "❌ Je suis déjà connecté dans un autre salon vocal.",
        ephemeral: true,
      });
    }

    try {
      await interaction.deferReply({ ephemeral: true });
      
      // Get OAuth token from database
      const account = await db.get_account(user.id);
      if (!account || !account.accessToken) {
        return interaction.editReply({
          content: "❌ Tu dois d'abord lier ton compte Spotify avec /linkspotify",
          ephemeral: true,
        });
      }
      await interaction.client.connectAndPlay(guild, member.voice.channel, user.id, account.accessToken);
      await interaction.editReply({
        content: "✅ **Muzika Bot** est prêt ! Sélectionne-le comme device dans Spotify (ton compte).",
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
