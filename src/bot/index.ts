import dotenv from 'dotenv';
dotenv.config();

import { Client, GatewayIntentBits, Partials, Collection } from 'discord.js';
import { prisma } from './lib/db';
import { handleMessage } from './events/messageCreate';
import { handleVoiceStateUpdate, resumeVoiceSessions } from './events/voiceStateUpdate';
import { handleInteraction } from './events/interactionCreate';

const token = process.env.TOKEN;
if (!token) {
  console.error('TOKEN not set in environment');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.once('ready', async () => {
  console.log(`Logged in as ${client.user?.tag}`);
  // Resume any voice sessions that were left open in DB
  await resumeVoiceSessions(client);
});

client.on('messageCreate', (message) => handleMessage(client, message));
client.on('voiceStateUpdate', (oldState, newState) => handleVoiceStateUpdate(oldState, newState));
client.on('interactionCreate', (interaction) => handleInteraction(interaction));

process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

client.login(token);
