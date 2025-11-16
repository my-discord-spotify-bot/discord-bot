const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('spotify_devices')
    .setDescription('Liste les appareils Spotify disponibles'),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const database = require('../../database');
      const account = await database.get_account(interaction.user.id);

      if (!account || !account.access_token) {
        return interaction.editReply({
          content: "❌ Aucun compte Spotify lié. Utilise `/linkspotify` pour lier ton compte.",
          ephemeral: true,
        });
      }

      const response = await axios.get('https://api.spotify.com/v1/me/player/devices', {
        headers: {
          'Authorization': `Bearer ${account.access_token}`,
        },
      });

      if (!response.data.devices || response.data.devices.length === 0) {
        return interaction.editReply({
          content: "❌ Aucun appareil Spotify trouvé. Assure-toi que Muzika Bot est démarré et connecté.",
          ephemeral: true,
        });
      }

      const devices = response.data.devices.map(device =>
        `• **${device.name}** (${device.type}) ${device.is_active ? '✅' : ''}`
      ).join('\n');

      await interaction.editReply({
        content: `🎧 **Appareils Spotify disponibles :**\n${devices}`,
        ephemeral: true,
      });
    } catch (error) {
      console.error("Erreur dans /spotify_devices:", error.response?.data || error.message);
      await interaction.editReply({
        content: "❌ Impossible de récupérer la liste des appareils Spotify.",
        ephemeral: true,
      });
    }
  },
};
