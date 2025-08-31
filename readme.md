Welcome to my Extreme Handler!
Created by: famq

This command and event handler is extremely robust, effecient and optimized.

Dependencies:

- "discord.js": "^14.16.2",
- "@discordjs/rest": "^2.4.0",
- "discord-api-types": "^0.37.100",
- "dotenv": "^16.4.5"
- "nodemon": "^3.1.7"

Features:

- Command Structure: Separate folders for slash commands and message commands
- Test Commands: /test, ?test and /owner-test
- Custom Prefixes: Message commands can specify a prefix or fall back to config.prefix, handled via a prefixCommands Map for efficient lookup.
- Integrated Interaction Handling: Slash commands can define and handle interaction components within their execute function, using a MessageComponentCollector for self-contained event handling.
- Command Metadata Caching: command-cache.json stores file paths, modification times, and command objects to skip reloading unchanged files, improving startup time in development.
- Slash Command Registration Caching: commands-cache.json stores a hash and JSON of registered slash commands to skip Discord API calls if unchanged, reducing startup time and rate limit risks.
- Permissions: Commands can define permissions to restrict access, checked client-side using PermissionFlagsBits.
- Cooldowns: Per-user cooldowns prevent spam, managed via a single Map.
- Owner Commands: Commands that can only be executed by the owner.
- Gateway Intents: All GatewayIntentBits enabled for flexibility with future commands.
- Console Logging: Detailed logging for command loading, errors, and bot status.
- Development Reloading: nodemon auto-restarts the bot on file changes, watching commands/, events/, index.js, config.json, command-cache.json, and commands-cache.json.
- Subfolder Support: Recursive loading supports commands in subfolders, enabling scalable organization.
- Error Handling: Centralized handleError function logs errors and sends user-friendly replies for execution, file loading, and API failures.
- Rate Limit Handling: Retries once on HTTP 429 errors during slash command registration, ensuring reliability.
- Asynchronous Operations: Uses fs.promises for non-blocking file loading, ensuring fast startup.
- Efficient Lookup: prefixCommands Map provides O(1) lookup for message commands, avoiding iteration over all commands.
- Concurrent Execution: Asynchronous event handling supports multiple users running commands simultaneously without lag.
- Environment Configuration: Uses .env for DISCORD_TOKEN and NODE_ENV, with config.json for prefix, defaultCooldown, clientId, and guildId.
- Dependency Management: package.json defines dependencies and dev dependencies, with package-lock.json ensuring consistent versions.
- Slash Command Registration: Registers commands globally or guild-specific, with caching to optimize restarts.
- Command Validation: Checks for required properties during loading, logging warnings for invalid commands.
- Graceful Shutdown: Handles SIGTERM and SIGINT signals to cleanly exit, preventing resource leaks.

Setup:

- Fork this repository
- Edit config.json & .env files
- Edit line 43 in index.js in-case your config fails to read your bots clientID.
- Run 'npm install'
- Enable Message Content Intent and Server Members Intent in the Discord Developer Portal
- Run the bot using 'npm dev'(development) or 'npm start'(production) in terminal
- Confirm the test commands work '/test' '?test' 'owner-test'
- Start creating commands!
