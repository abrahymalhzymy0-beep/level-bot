require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID || null;

if (!TOKEN) {
  console.error('Missing DISCORD_TOKEN in .env — cannot deploy commands.');
  // don't exit the whole process; return early
  return;
}

if (!CLIENT_ID) {
  console.error('Missing DISCORD_CLIENT_ID in .env — cannot deploy commands.');
  return;
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

try {
  if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js') || f.endsWith('.cjs') || f.endsWith('.ts'));
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      try {
        const command = require(filePath);
        if (command && command.data && typeof command.data.toJSON === 'function') {
          commands.push(command.data.toJSON());
        } else if (command && command.name && command.description) {
          // fallback for simple command export objects
          commands.push({ name: command.name, description: command.description, options: command.options || [] });
        } else {
          console.warn(`Command file ${file} does not export a valid command definition.`);
        }
      } catch (err) {
        console.warn(`Failed to load command ${file}:`, err && err.message ? err.message : err);
      }
    }
  } else {
    // Defaults if no commands folder
    commands.push({
      name: 'rank',
      description: 'عرض مستوى المستخدم (XP & Rank)',
      options: []
    });
    commands.push({
      name: 'leaderboard',
      description: 'عرض لوحة المتصدرين',
      options: []
    });
  }
} catch (err) {
  console.error('Error while reading command files:', err);
  // continue with whatever commands we have (might be empty)
}

(async () => {
  if (!commands.length) {
    console.warn('No commands found to register. Exiting deploy script without error.');
    return;
  }

  let rest;
  try {
    rest = new REST({ version: '10' }).setToken(TOKEN);
  } catch (err) {
    console.error('Failed to create REST client:', err);
    return;
  }

  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    if (GUILD_ID) {
      const data = await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands },
      );
      console.log(`Successfully registered ${data.length} guild commands for guild ${GUILD_ID}.`);
    } else {
      const data = await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: commands },
      );
      console.log(`Successfully registered ${data.length} global application commands.`);
    }
  } catch (error) {
    console.error('Error while registering commands (logged but not exiting):', error);
    // do not process.exit here to avoid taking down the host
  }
})();
