const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const { connectAndPlay } = require("../voicePlayer");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("join")
    .setDescription("Fait rejoindre le bot dans votre salon vocal et joue la musique Spotify."),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      return interaction.reply({ content: "❌ Cette commande ne fonctionne que sur un serveur.", ephemeral: true });
    }

    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
      return interaction.reply({
        content: "❌ Vous devez être dans un salon vocal pour utiliser cette commande.",
        ephemeral: true,
      });
    }

    const permissions = voiceChannel.permissionsFor(interaction.client.user);
    if (!permissions) {
      return interaction.reply({
        content: "❌ Impossible de vérifier mes permissions sur ce salon.",
        ephemeral: true,
      });
    }

    const required = [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.Connect,
      PermissionFlagsBits.Speak,
    ];

    if (!required.every((p) => permissions.has(p))) {
      return interaction.reply({
        content: "❌ Permissions insuffisantes pour rejoindre ce salon.",
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      await connectAndPlay(voiceChannel.guild, voiceChannel);

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("Connecté au salon vocal")
        .setDescription(
          `Viens écouter dans **${voiceChannel.name}**.\n\nEnsuite, dans Spotify, sélectionne le device **Muzika Bot**.`
        )
        .setFooter({ text: "Tu dois sélectionner manuellement le device du bot dans Spotify." });

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error("Erreur join :", err);
      return interaction.editReply({
        content: "❌ Impossible de rejoindre le salon vocal ou démarrer le player.",
      });
    }
  },
};
