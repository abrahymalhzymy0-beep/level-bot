require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID || null;

if (!TOKEN || !CLIENT_ID) {
  console.error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in .env');
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js') || f.endsWith('.cjs') || f.endsWith('.ts'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
      const command = require(filePath);
      if (command && command.data) {
        commands.push(command.data.toJSON());
      }
    } catch (err) {
      console.warn(`Failed to load command ${file}:`, err.message);
    }
  }
} else {
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

(async () => {
  const rest = new REST({ version: '10' }).setToken(TOKEN);

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
    console.error('Error while registering commands:', error);
    process.exit(1);
  }
})();
