module.exports = {
  name: "test",
  prefix: "?",
  permissions: ["SendMessages"],
  cooldown: 5,
  async execute(message, args) {
    await message.reply(
      "This is the message-based version of the test command!"
    );
  },
};
