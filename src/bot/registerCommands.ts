import { REST, Routes, ApplicationCommandOptionType } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

const token = process.env.TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
  console.error('TOKEN or DISCORD_CLIENT_ID not set');
  process.exit(1);
}

const commands = [
  {
    name: 'level',
    description: 'Show your level or another user',
    options: [
      { name: 'user', description: 'The user to view', type: ApplicationCommandOptionType.User, required: false },
    ],
  },
  {
    name: 'top',
    description: 'Show top members',
    options: [
      { name: 'type', description: 'top by (voice|text|level)', type: ApplicationCommandOptionType.String, required: true, choices: [ { name: 'voice', value: 'voice' }, { name: 'text', value: 'text' }, { name: 'level', value: 'level' } ] },
    ],
  },
];

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('Registering commands...');
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      console.log('Registered guild commands');
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      console.log('Registered global commands');
    }
  } catch (err) {
    console.error(err);
  }
})();
