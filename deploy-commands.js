require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID; // optional for guild-only registration

if (!token || !clientId) {
  console.error('DISCORD_TOKEN and DISCORD_CLIENT_ID must be set in .env');
  process.exit(1);
}

const commands = [
  new SlashCommandBuilder()
    .setName('level')
    .setDescription('Show your rank card'),
  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show server leaderboard')
    .addIntegerOption(opt =>
      opt.setName('limit').setDescription('How many users to show').setRequired(false))
].map(c => c.toJSON());

async function registerCommands() {
  try {
    const rest = new REST({ version: '10' }).setToken(token);

    if (guildId) {
      console.log(`Registering ${commands.length} commands for guild ${guildId}...`);
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      console.log('Guild commands registered.');
    } else {
      console.log(`Registering ${commands.length} global commands... (may take up to 1 hour)`);
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      console.log('Global commands registered.');
    }
  } catch (err) {
    console.error('Failed to register commands:', err);
    throw err;
  }
}

if (require.main === module) {
  registerCommands().catch(() => process.exit(1));
}

module.exports = registerCommands;
