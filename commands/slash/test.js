const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("test")
    .setDescription(
      "A test command with an embed, button, select menu, and modal."
    ),
  permissions: ["UseApplicationCommands"],
  cooldown: 5,
  async execute(interaction) {
    const buttonId = `test_button_${interaction.id}`;
    const selectMenuId = `test_select_${interaction.id}`;
    const modalId = `test_modal_${interaction.id}`;

    const embed = new EmbedBuilder()
      .setTitle("Test Command")
      .setDescription("Interact with the button or select menu below!")
      .setColor("#0099ff")
      .setThumbnail("https://example.com/thumbnail.png")
      .addFields({
        name: "Instructions",
        value:
          "Click the button to open a modal or choose an option from the menu.",
      });

    const button = new ButtonBuilder()
      .setCustomId(buttonId)
      .setLabel("Open Modal")
      .setStyle(ButtonStyle.Primary);

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(selectMenuId)
      .setPlaceholder("Choose an option")
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel("Option 1")
          .setDescription("First test option")
          .setValue("option1"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Option 2")
          .setDescription("Second test option")
          .setValue("option2")
      );

    const buttonRow = new ActionRowBuilder().addComponents(button);
    const selectRow = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({
      embeds: [embed],
      components: [buttonRow, selectRow],
      ephemeral: true,
    });

    const collector = interaction.channel.createMessageComponentCollector({
      filter: (i) =>
        i.user.id === interaction.user.id &&
        (i.customId === buttonId || i.customId === selectMenuId),
      time: 60000,
    });

    collector.on("collect", async (i) => {
      try {
        if (i.isButton() && i.customId === buttonId) {
          const modal = new ModalBuilder()
            .setCustomId(modalId)
            .setTitle("Test Modal")
            .addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId("test_input")
                  .setLabel("Enter some text")
                  .setStyle(TextInputStyle.Short)
                  .setRequired(true)
              )
            );

          await i.showModal(modal);

          const modalFilter = (m) =>
            m.customId === modalId && m.user.id === i.user.id;
          try {
            const modalInteraction = await i.awaitModalSubmit({
              filter: modalFilter,
              time: 30000,
            });
            const input =
              modalInteraction.fields.getTextInputValue("test_input");
            await modalInteraction.reply({
              content: `You submitted: ${input}`,
              ephemeral: true,
            });
          } catch (error) {
            console.error(`[ERROR] Modal submission failed: ${error.message}`);
            if (!i.deferred && !i.replied) {
              await i.reply({
                content: "Modal submission timed out or failed.",
                ephemeral: true,
              });
            }
          }
        } else if (i.isStringSelectMenu() && i.customId === selectMenuId) {
          const selected = i.values[0];
          await i.reply({
            content: `You selected: ${selected}`,
            ephemeral: true,
          });
        }
      } catch (error) {
        console.error(`[ERROR] Interaction handling failed: ${error.message}`);
        if (!i.deferred && !i.replied) {
          await i.reply({
            content: "An error occurred while processing your interaction.",
            ephemeral: true,
          });
        }
      }
    });

    collector.on("end", async () => {
      try {
        button.setDisabled(true);
        selectMenu.setDisabled(true);
        await interaction.editReply({
          embeds: [embed],
          components: [buttonRow, selectRow],
        });
      } catch (error) {
        console.error(`[ERROR] Failed to disable components: ${error.message}`);
      }
    });
  },
};
