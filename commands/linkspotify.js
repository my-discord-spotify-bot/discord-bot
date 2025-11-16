const {
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");
const { backendBaseUrl } = require("../config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("linkspotify")
    .setDescription("Lier ton compte Spotify au bot."),

  async execute(interaction) {
    const userId = interaction.user.id;

    // URL /login de ton backend, avec state = ID Discord de l'utilisateur
    const url = `${backendBaseUrl}/login?state=${encodeURIComponent(userId)}`;

    const button = new ButtonBuilder()
      .setLabel("Lier mon compte Spotify")
      .setStyle(ButtonStyle.Link)
      .setURL(url);

    const row = new ActionRowBuilder().addComponents(button);

    await interaction.reply({
      content:
        "Clique sur le bouton ci-dessous pour lier ton compte Spotify. Une fois terminé, tu pourras vérifier avec `/checkspotify`.",
      components: [row],
      ephemeral: true,
    });
  },
};
 
