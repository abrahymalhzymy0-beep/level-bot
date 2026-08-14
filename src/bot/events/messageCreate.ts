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

    // Optionally: check level up (simple formula)
    const newLevel = calculateLevel(member.totalXp + xpAmount);
    if (newLevel > member.level) {
      await prisma.member.update({ where: { id: member.id }, data: { level: newLevel } });
      // send level up message
      const channel = message.channel;
      channel.send(`${message.author}, congratulations! You've reached level ${newLevel}!`);
    }
  } catch (err) {
    console.error('handleMessage error', err);
  }
}

// Basic level formula: level = floor( (sqrt(1+8*totalXp/100)-1)/2 ) ?
// For simplicity, we'll use level up every 100 * level XP (progressive)
export function calculateLevel(totalXp: number) {
  // simple: level = floor( (sqrt(1 + 8 * totalXp / 100) - 1) / 2 )
  // but to keep simple linear growth: level ~ floor( (totalXp / 100)^(1/2) )
  // We'll implement: required XP for level n = 100 * n * n
  let level = 1;
  while (totalXp >= xpForLevel(level + 1)) level++;
  return level;
}

export function xpForLevel(level: number) {
  return 100 * level * level;
}
