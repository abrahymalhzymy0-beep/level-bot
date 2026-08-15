require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { exec } = require('child_process');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const AUTO_DEPLOY_COMMANDS = process.env.AUTO_DEPLOY_COMMANDS === 'true';

// TOKEN is required to run the bot. CLIENT_ID is required only for command deployment.
if (!TOKEN) {
  console.error('Missing DISCORD_TOKEN in .env — bot cannot start without a token.');
  // Exit because the bot cannot function without a token
  process.exit(1);
}

if (!CLIENT_ID) {
  console.warn('Warning: DISCORD_CLIENT_ID not set in .env — command deployment is disabled.');
}

// Global error handlers to avoid crashing the process on unexpected errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // don't exit, let the host decide whether to restart
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // don't exit
});

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once('ready', async () => {
  try {
    console.log(`Logged in as ${client.user.tag}`);

    if (AUTO_DEPLOY_COMMANDS) {
      if (!CLIENT_ID) {
        console.warn('AUTO_DEPLOY_COMMANDS is true but DISCORD_CLIENT_ID is not set — skipping auto-deploy.');
      } else {
        console.log('Auto-deploying slash commands...');
        // Execute deploy-commands in a safe try/catch and log output
        const child = exec('node deploy-commands.js', (err, stdout, stderr) => {
          if (err) {
            console.error('deploy-commands failed:', err);
            return;
          }
          if (stdout) console.log(stdout);
          if (stderr) console.error(stderr);
        });

        // In case the child process emits errors
        child.on('error', (err) => console.error('Failed to start deploy-commands process:', err));
      }
    }

    // XP system is assumed to be wired to DB elsewhere in the project. If the DB connection
    // is initialized in another module, ensure that module handles connectivity errors gracefully.
  } catch (err) {
    console.error('Error in ready handler:', err);
    // Do not crash the process; log and continue
  }
});

// Attempt to login and catch login errors to avoid unhandled rejections that kill the process
client.login(TOKEN).catch(err => {
  console.error('Failed to login with provided DISCORD_TOKEN:', err);
  // Do not call process.exit here — logging is enough; the host can restart if desired.
});
