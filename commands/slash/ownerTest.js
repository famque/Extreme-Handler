const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("owner-test")
    .setDescription("A test command restricted to the bot owner."),
  ownerOnly: true,
  async execute(interaction) {
    await interaction.reply({
      content: "This is an owner-only command!",
      ephemeral: true,
    });
  },
};
