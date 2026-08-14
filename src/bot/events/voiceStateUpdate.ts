import { VoiceState, Client } from 'discord.js';
import { prisma } from '../lib/db';

// When a user joins voice, create a VoiceSession with startAt
// When leaves, close session and add XP based on minutes

export async function handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
  try {
    const guildId = newState.guild.id;
    const userId = newState.id;

    // If joined a channel (wasn't in voice before)
    if (!oldState.channel && newState.channel) {
      // ensure guild exists
      let guild = await prisma.guild.findUnique({ where: { guildId } });
      if (!guild) guild = await prisma.guild.create({ data: { guildId } });

      // ensure member exists
      let member = await prisma.member.findUnique({ where: { discordId_guildId: { discordId: userId, guildId } } });
      if (!member) member = await prisma.member.create({ data: { discordId: userId, guildId } });

      await prisma.voiceSession.create({ data: { memberId: member.id, guildId, channelId: newState.channel.id, startAt: new Date() } });
    }

    // If moved between channels (old and new exist but different)
    if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
      // treat as leaving old channel then joining new channel
      const open = await prisma.voiceSession.findFirst({ where: { guildId, endAt: null }, orderBy: { startAt: 'desc' } });
      if (open) {
        const endAt = new Date();
        await prisma.voiceSession.update({ where: { id: open.id }, data: { endAt } });

        const minutes = Math.max(1, Math.ceil((endAt.getTime() - open.startAt.getTime()) / 60000));
        const guild = await prisma.guild.findUnique({ where: { guildId } });
        const perMinute = guild?.voiceXpPerMinute ?? 5;
        const xp = minutes * perMinute;

        const memberRecord = await prisma.member.findUnique({ where: { id: open.memberId } });
        if (memberRecord) {
          await prisma.member.update({ where: { id: memberRecord.id }, data: { voiceXp: { increment: xp }, totalXp: { increment: xp } } });
        }
      }

      // create new session for new channel
      let member = await prisma.member.findUnique({ where: { discordId_guildId: { discordId: userId, guildId } } });
      if (!member) member = await prisma.member.create({ data: { discordId: userId, guildId } });
      await prisma.voiceSession.create({ data: { memberId: member.id, guildId, channelId: newState.channel.id, startAt: new Date() } });
    }

    // If left a channel
    if (oldState.channel && !newState.channel) {
      // find open session for this member (use member record to find correct sessions)
      const member = await prisma.member.findUnique({ where: { discordId_guildId: { discordId: userId, guildId } } });
      if (!member) return;

      const open = await prisma.voiceSession.findFirst({ where: { guildId, memberId: member.id, endAt: null }, orderBy: { startAt: 'desc' } });
      if (open) {
        const endAt = new Date();
        await prisma.voiceSession.update({ where: { id: open.id }, data: { endAt } });

        // compute minutes
        const minutes = Math.max(1, Math.ceil((endAt.getTime() - open.startAt.getTime()) / 60000));

        const guild = await prisma.guild.findUnique({ where: { guildId } });
        const perMinute = guild?.voiceXpPerMinute ?? 5;
        const xp = minutes * perMinute;

        // update member XP
        await prisma.member.update({ where: { id: member.id }, data: { voiceXp: { increment: xp }, totalXp: { increment: xp } } });
      }
    }
  } catch (err) {
    console.error('voiceStateUpdate error', err);
  }
}

// On startup, resume voice sessions that were left open (endAt == null). If member is still in voice, keep session; otherwise close at startup time.
export async function resumeVoiceSessions(client: Client) {
  const openSessions = await prisma.voiceSession.findMany({ where: { endAt: null }, include: { member: true } });
  const now = new Date();

  for (const s of openSessions) {
    try {
      const guild = await client.guilds.fetch(s.guildId).catch(() => null);
      if (!guild) {
        // can't fetch guild: keep as-is
        continue;
      }

      const discordId = s.member.discordId;
      const memberInGuild = await guild.members.fetch(discordId).catch(() => null);
      if (memberInGuild && memberInGuild.voice.channel) {
        // user still in voice: keep session open
        continue;
      } else {
        // user not in voice: close session at now
        await prisma.voiceSession.update({ where: { id: s.id }, data: { endAt: now } });

        const minutes = Math.max(1, Math.ceil((now.getTime() - s.startAt.getTime()) / 60000));
        const guildSettings = await prisma.guild.findUnique({ where: { guildId: s.guildId } });
        const perMinute = guildSettings?.voiceXpPerMinute ?? 5;
        const xp = minutes * perMinute;

        const memberRecord = s.member;
        if (memberRecord) {
          await prisma.member.update({ where: { id: memberRecord.id }, data: { voiceXp: { increment: xp }, totalXp: { increment: xp } } });
        }
      }
    } catch (err) {
      console.error('resumeVoiceSessions error for session', s.id, err);
    }
  }
}
