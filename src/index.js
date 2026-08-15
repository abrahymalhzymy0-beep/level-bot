require('dotenv').config();
const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const db = require('./lib/db');
const xpUtil = require('./lib/xp');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DEPLOY_ON_START = process.env.DEPLOY_ON_START === 'true';
const COOLDOWN_SECONDS = parseInt(process.env.XP_COOLDOWN_SECONDS || '60', 10);

if (!TOKEN || !CLIENT_ID) {
  console.error('Please set DISCORD_TOKEN and DISCORD_CLIENT_ID in .env');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// load commands
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

// in-memory cooldowns map: { `${guildId}:${userId}` -> timestamp }
const lastXpAt = new Map();

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  if (DEPLOY_ON_START) {
    console.log('DEPLOY_ON_START is true: attempting to register commands on startup...');
    // call deploy-commands.js programmatically
    try {
      await require('../deploy-commands')();
    } catch (e) {
      console.warn('Automatic deploy failed (script wrapper not present). You can run: npm run deploy-commands');
    }
  }
});

client.on('messageCreate', async (message) => {
  try {
    if (message.author.bot || !message.guild) return;

    const key = `${message.guild.id}:${message.author.id}`;
    const last = lastXpAt.get(key) || 0;
    const now = Date.now();
    if (now - last < COOLDOWN_SECONDS * 1000) return; // cooldown

    // award XP (random small amount)
    const gained = Math.floor(Math.random() * 15) + 10; // 10..24
    const currentTotal = db.getUserXp(message.author.id, message.guild.id);
    const newTotal = currentTotal + gained;
    db.setUserXp(message.author.id, message.guild.id, newTotal);
    lastXpAt.set(key, now);

    // check for level up
    const before = xpUtil.levelForXp(currentTotal).level;
    const after = xpUtil.levelForXp(newTotal).level;
    if (after > before) {
      // prepare embed
      const levelInfo = xpUtil.levelForXp(newTotal);
      const avatarURL = message.author.displayAvatarURL({ extension: 'png', size: 256 });
      const xpInto = levelInfo.xpIntoLevel || 0;
      const xpForNext = levelInfo.xpForNext || 1;
      const progressPercent = Math.floor((xpInto / xpForNext) * 100);

      const embed = new EmbedBuilder()
        .setTitle('🎉 مبروك! لقد ارتقيت!')
        .setDescription(`تهانينا <@${message.author.id}> — لقد وصلت إلى مستوى جديد!`)
        .setColor(0x00AE86)
        .setThumbnail(avatarURL)
        .addFields(
          { name: 'المستوى الجديد', value: `**${after}**`, inline: true },
          { name: 'النقاط داخل المستوى', value: `\`${xpInto} / ${xpForNext}\` (${progressPercent}%)`, inline: true },
          { name: 'مجموع النقاط (XP)', value: `\`${newTotal} XP\``, inline: true }
        )
        .setFooter({ text: `استمر هكذا!`, iconURL: avatarURL })
        .setTimestamp();

      // send to configured channel if provided, else send in same channel
      const levelUpChannelId = process.env.LEVELUP_CHANNEL_ID;
      if (levelUpChannelId) {
        const ch = message.guild.channels.cache.get(levelUpChannelId);
        if (ch && typeof ch.isTextBased === 'function' && ch.isTextBased()) {
          await ch.send({ embeds: [embed] });
        } else {
          await message.channel.send({ embeds: [embed] });
        }
      } else {
        await message.channel.send({ embeds: [embed] });
      }
    }
  } catch (err) {
    console.error('Error in messageCreate handler:', err);
  }
});

// interaction handling
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction);
  } catch (err) {
    console.error('Command error', err);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: 'There was an error while executing this command.' });
    } else {
      await interaction.reply({ content: 'There was an error while executing this command.', ephemeral: true });
    }
  }
});

client.login(TOKEN);
