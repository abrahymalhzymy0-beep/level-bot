const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const db = require('../lib/db');
const xpUtil = require('../lib/xp');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('Show your rank card'),
  async execute(interaction) {
    await interaction.deferReply();

    const userId = interaction.user.id;
    const guildId = interaction.guildId || 'dm';
    const totalXp = db.getUserXp(userId, guildId);
    const { level, xpIntoLevel, xpForNext } = xpUtil.levelForXp(totalXp);

    // Create canvas
    const width = 800;
    const height = 240;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#2C2F33';
    ctx.fillRect(0, 0, width, height);

    // Card background
    ctx.fillStyle = '#23272A';
    roundRect(ctx, 20, 20, width - 40, height - 40, 16);
    ctx.fill();

    // Load avatar
    try {
      const avatarURL = interaction.user.displayAvatarURL({ extension: 'png', size: 256 });
      const avatar = await loadImage(avatarURL);
      // draw circle avatar
      const avatarX = 36;
      const avatarY = 36;
      const avatarSize = 168;
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore();
    } catch (err) {
      console.warn('Could not load avatar:', err);
    }

    // Username
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '28px Sans';
    const displayName = `${interaction.user.username}#${interaction.user.discriminator}`;
    ctx.fillText(displayName, 220, 80);

    // Level box
    ctx.fillStyle = '#99AAB5';
    ctx.font = '22px Sans';
    ctx.fillText(`Level: ${level}`, 220, 115);

    // XP text
    ctx.font = '20px Sans';
    ctx.fillStyle = '#B9BBBE';
    ctx.fillText(`XP: ${xpIntoLevel} / ${xpForNext}`, 220, 145);

    // Progress bar background
    const barX = 220;
    const barY = 165;
    const barWidth = 520;
    const barHeight = 30;

    // background
    ctx.fillStyle = '#2f3136';
    roundRect(ctx, barX, barY, barWidth, barHeight, 8);
    ctx.fill();

    // progress
    const progress = Math.max(0, Math.min(1, xpIntoLevel / xpForNext));
    const innerWidth = Math.floor(barWidth * progress);

    // gradient
    const grad = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
    grad.addColorStop(0, '#00c6ff');
    grad.addColorStop(1, '#0072ff');
    ctx.fillStyle = grad;
    roundRect(ctx, barX + 2, barY + 2, innerWidth - 4, barHeight - 4, 6);
    ctx.fill();

    // Optional: draw text percentage on the bar
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px Sans';
    ctx.fillText(`${Math.floor(progress * 100)}%`, barX + barWidth - 60, barY + 22);

    // send as attachment
    const buffer = canvas.toBuffer();
    const attachment = new AttachmentBuilder(buffer, { name: 'rank-card.png' });

    await interaction.editReply({ files: [attachment] });
  }
};

function roundRect(ctx, x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
