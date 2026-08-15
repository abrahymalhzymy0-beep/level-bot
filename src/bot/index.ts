import dotenv from 'dotenv';
dotenv.config();

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Ensure DB schema is pushed before the app attempts queries.
// Some hosts (like Wispbyte) bypass package.json start scripts, so run prisma db push here.
import { execSync } from 'child_process';
try {
  console.log('Ensuring Prisma Client is generated...');
  execSync('npx prisma generate', { stdio: 'inherit' });
} catch (err) {
  console.error('prisma generate failed (continuing):', err);
}

try {
  console.log('Pushing Prisma schema to the database (prisma db push)...');
  execSync('npx prisma db push', { stdio: 'inherit' });
} catch (err) {
  console.error('prisma db push failed (continuing):', err);
}

// Import Prisma client after ensuring schema is applied
const { prisma } = await import('./lib/db');

import { Client, GatewayIntentBits } from 'discord.js';
import { handleMessage } from './events/messageCreate';
import { handleVoiceStateUpdate, resumeVoiceSessions } from './events/voiceStateUpdate';
import { handleInteraction } from './events/interactionCreate';

// Support both TOKEN and DISCORD_TOKEN environment variable names
const token = process.env.TOKEN || process.env.DISCORD_TOKEN;
if (!token) {
  console.error('TOKEN or DISCORD_TOKEN not set in environment');
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
  try {
    console.log(`Logged in as ${client.user?.tag}`);
    // Resume any voice sessions that were left open in DB
    try {
      await resumeVoiceSessions(client);
    } catch (err) {
      console.error('Failed to resume voice sessions:', err);
      // don't crash the bot; log and continue
    }
  } catch (err) {
    console.error('Error in ready handler:', err);
  }
});

client.on('messageCreate', (message) => {
  try {
    handleMessage(client, message);
  } catch (err) {
    console.error('Error in messageCreate handler:', err);
  }
});

client.on('voiceStateUpdate', (oldState, newState) => {
  try {
    handleVoiceStateUpdate(oldState, newState);
  } catch (err) {
    console.error('Error in voiceStateUpdate handler:', err);
  }
});

client.on('interactionCreate', (interaction) => {
  try {
    handleInteraction(interaction);
  } catch (err) {
    console.error('Error in interactionCreate handler:', err);
  }
});

process.on('SIGINT', async () => {
  console.log('Shutting down...');
  try {
    await prisma.$disconnect();
  } catch (err) {
    console.error('Error disconnecting Prisma client:', err);
  }
  process.exit(0);
});

client.login(token).catch(err => {
  console.error('Failed to login with provided token:', err);
});
