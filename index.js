require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Collection,
  REST,
  Routes,
} = require("discord.js");
const fs = require("fs");
const path = require("path");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});
client.commands = new Collection();

const commandFiles = fs
  .readdirSync(path.join(__dirname, "commands"))
  .filter((file) => file.endsWith(".js"));

// Load commands
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

// Register commands
const registerCommands = async () => {
  const commands = commandFiles.map((file) => {
    const command = require(`./commands/${file}`);
    return command.data.toJSON();
  });

  const clientId = process.env.CLIENT_ID;
  const guildId = process.env.GUILD_ID;

  const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);

  try {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    });
  } catch (error) {
    console.error("Error registering commands:", error);
  }
};

client.once("ready", () => {
  registerCommands();
});

// Handle interactions
client.on("interactionCreate", async (interaction) => {
  if (interaction.isCommand()) {
    const command = client.commands.get(interaction.commandName);

    if (!command) {
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      await interaction.reply({
        content: "There was an error while executing this command!",
        flags: 64,
      });
    }
  } else if (interaction.isButton()) {
    // Handle button interactions
    const buttonHandlerFiles = fs
      .readdirSync(path.join(__dirname, "handlers/buttonHandlers"))
      .filter((file) => file.endsWith(".js"));
    for (const file of buttonHandlerFiles) {
      const handler = require(`./handlers/buttonHandlers/${file}`);
      await handler(interaction);
    }
  } else if (interaction.isModalSubmit()) {
    // Handle modal submissions
    const modalHandlerFiles = fs
      .readdirSync(path.join(__dirname, "handlers/modalHandlers"))
      .filter((file) => file.endsWith(".js"));
    for (const file of modalHandlerFiles) {
      const handler = require(`./handlers/modalHandlers/${file}`);
      await handler(interaction);
    }
  } else if (interaction.isStringSelectMenu()) {
    // Handle select menu interactions
    const selectMenuHandlerFiles = fs
      .readdirSync(path.join(__dirname, "handlers/selectMenuHandlers"))
      .filter((file) => file.endsWith(".js"));
    for (const file of selectMenuHandlerFiles) {
      const handler = require(`./handlers/selectMenuHandlers/${file}`);
      await handler(interaction);
    }
  }
});

// Load events
const eventFiles = fs
  .readdirSync(path.join(__dirname, "events"))
  .filter((file) => file.endsWith(".js"));
for (const file of eventFiles) {
  const event = require(`./events/${file}`);
  const bind = (...args) => event.execute(...args, client);
  if (event.once) {
    client.once(event.name, bind);
  } else {
    client.on(event.name, bind);
  }
}

client.login(process.env.BOT_TOKEN);
