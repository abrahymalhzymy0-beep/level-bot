import { Interaction } from 'discord.js';
import { prisma } from '../lib/db';
import { calculateLevel, xpForLevel } from './messageCreate';

export async function handleInteraction(interaction: Interaction) {
  try {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'level') {
      const target = interaction.options.getUser('user') ?? interaction.user;
      const guild = interaction.guild;
      if (!guild) return interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true });

      const member = await prisma.member.findUnique({ where: { discordId_guildId: { discordId: target.id, guildId: guild.id } } });
      if (!member) return interaction.reply({ content: `${target.username} has no XP yet.`, ephemeral: true });

      const currentLevel = member.level;
      const totalXp = member.totalXp;
      const nextLevelXp = xpForLevel(currentLevel + 1);
      const progress = Math.min(1, totalXp / nextLevelXp);

      await interaction.reply({ content: `${target.username} - Level ${currentLevel}\nTotal XP: ${totalXp}\nText XP: ${member.textXp}\nVoice XP: ${member.voiceXp}\nProgress: ${(progress * 100).toFixed(2)}%`, ephemeral: false });
    }

    if (commandName === 'top') {
      const type = interaction.options.getString('type') ?? 'level';
      const guild = interaction.guild;
      if (!guild) return interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true });

      let rows;
      if (type === 'voice') {
        rows = await prisma.member.findMany({ where: { guildId: guild.id }, orderBy: { voiceXp: 'desc' }, take: 10 });
        const lines = await Promise.all(rows.map(async (r, i) => {
          const user = await guild.members.fetch(r.discordId).catch(() => null);
          return `#${i + 1} ${user ? user.user.username : r.discordId} - ${r.voiceXp} voice XP`;
        }));
        await interaction.reply({ content: lines.join('\n'), ephemeral: false });
      } else if (type === 'text') {
        rows = await prisma.member.findMany({ where: { guildId: guild.id }, orderBy: { textXp: 'desc' }, take: 10 });
        const lines = await Promise.all(rows.map(async (r, i) => {
          const user = await guild.members.fetch(r.discordId).catch(() => null);
          return `#${i + 1} ${user ? user.user.username : r.discordId} - ${r.textXp} text XP`;
        }));
        await interaction.reply({ content: lines.join('\n'), ephemeral: false });
      } else {
        rows = await prisma.member.findMany({ where: { guildId: guild.id }, orderBy: [{ level: 'desc' }, { totalXp: 'desc' }], take: 10 });
        const lines = await Promise.all(rows.map(async (r, i) => {
          const user = await guild.members.fetch(r.discordId).catch(() => null);
          return `#${i + 1} ${user ? user.user.username : r.discordId} - Level ${r.level} (${r.totalXp} XP)`;
        }));
        await interaction.reply({ content: lines.join('\n'), ephemeral: false });
      }
    }
  } catch (err) {
    console.error('interaction handler error', err);
  }
}
