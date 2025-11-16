const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { joinVoiceChannel } = require("@discordjs/voice");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("join")
    .setDescription("Fait rejoindre le bot dans votre salon vocal."),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: "❌ Cette commande ne peut être utilisée que sur un serveur.",
        ephemeral: true,
      });
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
        content: "❌ Je ne peux pas vérifier mes permissions sur ce salon.",
        ephemeral: true,
      });
    }

    const requiredPermissions = [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.Connect,
      PermissionFlagsBits.Speak,
    ];

    const missingPermissions = requiredPermissions.filter(
      (permission) => !permissions.has(permission)
    );

    if (missingPermissions.length > 0) {
      return interaction.reply({
        content: "❌ Je n'ai pas les permissions nécessaires pour rejoindre ce salon.",
        ephemeral: true,
      });
    }

    try {
      joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: false,
      });

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setDescription(`✅ Connecté au salon vocal **${voiceChannel.name}**.`);

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Erreur lors de la connexion vocale :", error);
      return interaction.reply({
        content: "❌ Impossible de rejoindre le salon vocal. Veuillez réessayer.",
        ephemeral: true,
      });
    }
  },
};
