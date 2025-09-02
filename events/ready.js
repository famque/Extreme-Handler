module.exports = {
  name: "clientReady",
  once: true,
  execute(client) {
    console.log(`[INFO] Logged in as ${client.user.tag}`);
  },
};
