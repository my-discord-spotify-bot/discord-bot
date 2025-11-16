const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('disconnect')
    .setDescription('Déconnecte Muzika Bot du salon vocal'),
  async execute(interaction) {
    interaction.client.disconnectFromGuild(interaction.guild.id);
    await interaction.reply({
      content: "🔌 Muzika Bot déconnecté !",
      ephemeral: true,
    });
  },
};
