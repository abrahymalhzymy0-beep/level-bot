require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { exec } = require('child_process');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const AUTO_DEPLOY_COMMANDS = process.env.AUTO_DEPLOY_COMMANDS === 'true';

if (!TOKEN || !CLIENT_ID) {
  console.error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in .env');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  if (AUTO_DEPLOY_COMMANDS) {
    console.log('Auto-deploying slash commands...');
    exec('node deploy-commands.js', (err, stdout, stderr) => {
      if (err) {
        console.error('deploy-commands failed:', err);
        return;
      }
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
    });
  }

  // XP system is assumed to be already wired to DB elsewhere in the project
});

client.login(TOKEN);
