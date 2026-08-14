import { Client, Message } from 'discord.js';
import { prisma } from '../lib/db';

// In-memory cooldowns: map key = `${guildId}:${userId}` -> timestamp of last XP grant
const cooldowns = new Map<string, number>();

export async function handleMessage(client: Client, message: Message) {
  try {
    if (message.author.bot) return;
    if (!message.guild) return;

    const guildId = message.guild.id;
    const userId = message.author.id;

    // Ensure guild settings exist
    let guild = await prisma.guild.findUnique({ where: { guildId } });
    if (!guild) {
      guild = await prisma.guild.create({ data: { guildId } });
    }

    const key = `${guildId}:${userId}`;
    const now = Date.now();
    const last = cooldowns.get(key) ?? 0;
    const cooldownMs = guild.textXpCooldown * 1000;

    if (now - last < cooldownMs) return; // still in cooldown

    // grant XP for message
    const xpAmount = guild.textXpPerMessage;

    // upsert member
    const member = await prisma.member.upsert({
      where: { discordId_guildId: { discordId: userId, guildId } },
      update: {
        totalXp: { increment: xpAmount },
        textXp: { increment: xpAmount },
      },
      create: {
        discordId: userId,
        guildId,
        totalXp: xpAmount,
        textXp: xpAmount,
      },
    });

    cooldowns.set(key, now);

    // Check level up using the updated totalXp from the upsert result
    const newLevel = calculateLevel(member.totalXp);
    if (newLevel > member.level) {
      await prisma.member.update({ where: { id: member.id }, data: { level: newLevel } });
      // send level up message (best-effort)
      try {
        await message.channel.send(`${message.author}, congratulations! You've reached level ${newLevel}!`);
      } catch (err) {
        // ignore send errors
      }
    }
  } catch (err) {
    console.error('handleMessage error', err);
  }
}

// Level system: required XP for level n = 100 * n * n
export function xpForLevel(level: number) {
  return 100 * level * level;
}

export function calculateLevel(totalXp: number) {
  let level = 1;
  while (totalXp >= xpForLevel(level + 1)) level++;
  return level;
}
