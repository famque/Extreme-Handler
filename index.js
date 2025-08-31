require("dotenv").config();
const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");
const {
  Client,
  GatewayIntentBits,
  Collection,
  REST,
  Routes,
  PermissionFlagsBits,
} = require("discord.js");
const config = require("./config.json");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.DirectMessageTyping,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildScheduledEvents,
    GatewayIntentBits.AutoModerationConfiguration,
    GatewayIntentBits.AutoModerationExecution,
  ],
});
client.commands = new Collection();
client.cooldowns = new Map();
client.prefixCommands = new Map();

const token = process.env.DISCORD_TOKEN;
const clientId = config.clientId || "YOUR_BOTS_CLIENT_ID";
const guildId = process.env.NODE_ENV === "development" ? config.guildId : null;

let lastRegisteredHash = "";
let commandCache = {};
try {
  commandCache = require("./commands-cache.json");
  lastRegisteredHash = commandCache.hash || "";
} catch (error) {
  console.warn(
    "[WARNING] commands-cache.json not found; will create on registration."
  );
}
let fileCache = {};
try {
  fileCache = require("./command-cache.json");
} catch (error) {
  console.warn("[WARNING] command-cache.json not found; will create on load.");
}

// Centralized error handling
async function handleError(interactionOrMessage, commandName, error) {
  console.error(
    `[ERROR] Error executing command ${commandName}: ${error.message}`
  );
  const content = "There was an error while executing this command!";
  try {
    if (interactionOrMessage.isChatInputCommand?.()) {
      if (interactionOrMessage.replied || interactionOrMessage.deferred) {
        await interactionOrMessage.followUp({ content, ephemeral: true });
      } else {
        await interactionOrMessage.reply({ content, ephemeral: true });
      }
    } else {
      await interactionOrMessage.reply(content);
    }
  } catch (replyError) {
    console.error(`[ERROR] Failed to send error reply: ${replyError.message}`);
  }
}

// Load commands recursively
async function loadCommands(dir, isSlash, isMessage) {
  const files = await fs.readdir(dir, { withFileTypes: true });
  const newCache = {};
  for (const file of files) {
    const filePath = path.join(dir, file.name);
    if (file.isDirectory()) {
      await loadCommands(filePath, isSlash, isMessage);
      continue;
    }
    if (!file.name.endsWith(".js")) continue;

    const stats = await fs.stat(filePath);
    const cacheKey = filePath;
    const cacheEntry = fileCache[cacheKey];
    if (cacheEntry && cacheEntry.mtime === stats.mtimeMs) {
      client.commands.set(cacheEntry.name, cacheEntry.command);
      if (isSlash && cacheEntry.command.data) {
        console.log(
          `[INFO] Loaded cached slash command: ${cacheEntry.command.data.name} from ${filePath}`
        );
      }
      if (isMessage && cacheEntry.command.name) {
        console.log(
          `[INFO] Loaded cached message command: ${cacheEntry.command.name} from ${filePath}`
        );
        if (cacheEntry.command.aliases?.length) {
          cacheEntry.command.aliases.forEach((alias) =>
            client.commands.set(alias, cacheEntry.command)
          );
        }
        const prefix = cacheEntry.command.prefix || config.prefix;
        client.prefixCommands.set(
          `${prefix}:${cacheEntry.command.name}`,
          cacheEntry.command
        );
        cacheEntry.command.aliases?.forEach((alias) =>
          client.prefixCommands.set(`${prefix}:${alias}`, cacheEntry.command)
        );
      }
      newCache[cacheKey] = cacheEntry;
      continue;
    }

    try {
      const command = require(filePath);
      const hasSlash =
        "data" in command && typeof command.execute === "function";
      const hasMessage =
        "name" in command && typeof command.execute === "function";

      if (isSlash && !hasSlash) {
        console.warn(
          `[WARNING] Command ${file.name} in ${dir} missing 'data' or 'execute' for slash command.`
        );
        continue;
      }
      if (isMessage && !hasMessage) {
        console.warn(
          `[WARNING] Command ${file.name} in ${dir} missing 'name' or 'execute' for message command.`
        );
        continue;
      }

      if (hasSlash && isSlash) {
        client.commands.set(command.data.name, command);
        console.log(
          `[INFO] Loaded slash command: ${command.data.name} from ${filePath}`
        );
      }
      if (hasMessage && isMessage) {
        client.commands.set(command.name, command);
        if (command.aliases?.length) {
          command.aliases.forEach((alias) =>
            client.commands.set(alias, command)
          );
        }
        const prefix = command.prefix || config.prefix;
        client.prefixCommands.set(`${prefix}:${command.name}`, command);
        command.aliases?.forEach((alias) =>
          client.prefixCommands.set(`${prefix}:${alias}`, command)
        );
        console.log(
          `[INFO] Loaded message command: ${command.name} from ${filePath}`
        );
      }

      newCache[cacheKey] = {
        name: command.data?.name || command.name,
        command,
        mtime: stats.mtimeMs,
      };
    } catch (error) {
      console.error(
        `[ERROR] Failed to load command ${file.name} from ${filePath}: ${error.message}`
      );
    }
  }
  fileCache = newCache;
  try {
    await fs.writeFile(
      path.join(__dirname, "command-cache.json"),
      JSON.stringify(fileCache, null, 2)
    );
  } catch (error) {
    console.error(
      `[ERROR] Failed to save command-cache.json: ${error.message}`
    );
  }
}

// Load events recursively
async function loadEvents(dir) {
  const files = await fs.readdir(dir, { withFileTypes: true });
  for (const file of files) {
    const filePath = path.join(dir, file.name);
    if (file.isDirectory()) {
      await loadEvents(filePath);
    } else if (file.name.endsWith(".js")) {
      try {
        const event = require(filePath);
        if ("name" in event && "execute" in event) {
          client[event.once ? "once" : "on"](event.name, (...args) =>
            event.execute(...args)
          );
          console.log(`[INFO] Loaded event: ${event.name} from ${filePath}`);
        } else {
          console.warn(
            `[WARNING] Event at ${filePath} missing 'name' or 'execute' properties.`
          );
        }
      } catch (error) {
        console.error(
          `[ERROR] Failed to load event ${file.name} from ${filePath}: ${error.message}`
        );
      }
    }
  }
}

// Handle slash command interactions
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    console.error(`[ERROR] Command ${interaction.commandName} not found.`);
    return;
  }

  if (command.ownerOnly && interaction.user.id !== config.ownerId) {
    return interaction.reply({
      content: "This command is restricted to the bot owner.",
      ephemeral: true,
    });
  }

  if (
    command.permissions &&
    !interaction.member?.permissions.has(command.permissions)
  ) {
    return interaction.reply({
      content: "You do not have permission to use this command.",
      ephemeral: true,
    });
  }

  const cooldownKey = `${interaction.commandName}:${interaction.user.id}`;
  const now = Date.now();
  const cooldownAmount = (command.cooldown || config.defaultCooldown) * 1000;
  if (client.cooldowns.has(cooldownKey)) {
    const expirationTime = client.cooldowns.get(cooldownKey);
    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      return interaction.reply({
        content: `Please wait ${timeLeft.toFixed(1)} seconds before reusing \`${
          interaction.commandName
        }\`.`,
        ephemeral: true,
      });
    }
  }
  client.cooldowns.set(cooldownKey, now + cooldownAmount);
  setTimeout(() => client.cooldowns.delete(cooldownKey), cooldownAmount);

  try {
    await command.execute(interaction);
  } catch (error) {
    await handleError(interaction, interaction.commandName, error);
  }
});

// Handle message-based commands
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  let command, commandName, args;
  const content = message.content;
  for (const [key, cmd] of client.prefixCommands) {
    const [prefix, name] = key.split(":");
    if (content.startsWith(prefix + name)) {
      command = cmd;
      commandName = name;
      args = content
        .slice(prefix.length + name.length)
        .trim()
        .split(/ +/);
      break;
    }
  }

  if (!command) return;

  if (command.ownerOnly && message.author.id !== config.ownerId) {
    return message.reply("This command is restricted to the bot owner.");
  }

  if (
    command.permissions &&
    !message.member?.permissions.has(command.permissions)
  ) {
    return message.reply("You do not have permission to use this command.");
  }

  const cooldownKey = `${commandName}:${message.author.id}`;
  const now = Date.now();
  const cooldownAmount = (command.cooldown || config.defaultCooldown) * 1000;
  if (client.cooldowns.has(cooldownKey)) {
    const expirationTime = client.cooldowns.get(cooldownKey);
    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      return message.reply(
        `Please wait ${timeLeft.toFixed(
          1
        )} seconds before reusing \`${commandName}\`.`
      );
    }
  }
  client.cooldowns.set(cooldownKey, now + cooldownAmount);
  setTimeout(() => client.cooldowns.delete(cooldownKey), cooldownAmount);

  try {
    await command.execute(message, args);
  } catch (error) {
    await handleError(message, commandName, error);
  }
});

// Register slash commands
async function registerCommands() {
  const commands = client.commands
    .filter((command) => "data" in command)
    .map((command) => command.data.toJSON());
  const commandHash = crypto
    .createHash("md5")
    .update(JSON.stringify(commands))
    .digest("hex");
  if (commandHash === lastRegisteredHash) {
    console.log("[INFO] No changes in slash commands; skipping registration.");
    return;
  }

  const rest = new REST({ version: "10" }).setToken(token);
  try {
    console.log("[INFO] Started refreshing application (/) commands.");
    await rest.put(
      guildId
        ? Routes.applicationGuildCommands(clientId, guildId)
        : Routes.applicationCommands(clientId),
      { body: commands }
    );
    console.log(
      `[INFO] Successfully registered commands ${
        guildId ? `for guild ${guildId}` : "globally"
      }.`
    );
    await fs.writeFile(
      path.join(__dirname, "commands-cache.json"),
      JSON.stringify({ hash: commandHash, commands }, null, 2)
    );
    lastRegisteredHash = commandHash;
  } catch (error) {
    if (error.code === 429) {
      console.warn("[WARNING] Rate limit hit; retrying in 5s.");
      await new Promise((resolve) => setTimeout(resolve, 5000));
      await rest.put(
        guildId
          ? Routes.applicationGuildCommands(clientId, guildId)
          : Routes.applicationCommands(clientId),
        { body: commands }
      );
      console.log(
        `[INFO] Successfully registered commands ${
          guildId ? `for guild ${guildId}` : "globally"
        } after retry.`
      );
      await fs.writeFile(
        path.join(__dirname, "commands-cache.json"),
        JSON.stringify({ hash: commandHash, commands }, null, 2)
      );
      lastRegisteredHash = commandHash;
    } else {
      console.error(`[ERROR] Failed to register commands: ${error.message}`);
    }
  }
}

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[INFO] Received SIGTERM; shutting down.");
  await client.destroy();
  process.exit(0);
});
process.on("SIGINT", async () => {
  console.log("[INFO] Received SIGINT; shutting down.");
  await client.destroy();
  process.exit(0);
});

// Initialize and login
(async () => {
  await loadEvents(path.join(__dirname, "events"));
  await loadCommands(path.join(__dirname, "commands/slash"), true, false);
  await loadCommands(path.join(__dirname, "commands/message"), false, true);
  await client.login(token);
  await registerCommands();
})();
