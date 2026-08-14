import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// local helper to ensure user has manage perms for guild (duplicate of backend index check)
function ensureGuildManagePermission(req: any, res: any, next: any) {
  const user = req.user as any;
  const guildId = req.params.guildId || req.body.guildId || req.query.guildId;
  if (!user || !user.guilds) return res.status(403).json({ error: 'forbidden' });
  const g = (user.guilds as any[]).find((x) => x.id === guildId);
  if (!g) return res.status(403).json({ error: 'forbidden' });
  const perms = BigInt(g.permissions);
  const ADMIN = BigInt(0x8);
  const MANAGE_GUILD = BigInt(0x20);
  if ((perms & ADMIN) === ADMIN || (perms & MANAGE_GUILD) === MANAGE_GUILD) return next();
  return res.status(403).json({ error: 'forbidden' });
}

// GET /api/members/:guildId?page=1&search=
router.get('/:guildId', ensureGuildManagePermission, async (req, res) => {
  try {
    const guildId = req.params.guildId;
    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = 20;
    const search = String(req.query.search || '').trim();

    const where: any = { guildId };
    if (search) {
      where.OR = [{ discordId: { contains: search } }];
    }

    const members = await prisma.member.findMany({ where, orderBy: { totalXp: 'desc' }, skip: (page - 1) * perPage, take: perPage });
    const total = await prisma.member.count({ where: { guildId } });

    res.json({ members, page, perPage, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// GET /api/members/:guildId/:memberId
router.get('/:guildId/:memberId', ensureGuildManagePermission, async (req, res) => {
  try {
    const guildId = req.params.guildId;
    const memberId = Number(req.params.memberId);
    const m = await prisma.member.findUnique({ where: { id: memberId } });
    if (!m || m.guildId !== guildId) return res.status(404).json({ error: 'not found' });
    res.json(m);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// POST /api/members/:guildId/:memberId/add-xp { amount, type }
router.post('/:guildId/:memberId/add-xp', ensureGuildManagePermission, async (req, res) => {
  try {
    const { amount, type } = req.body;
    const guildId = req.params.guildId;
    const memberId = Number(req.params.memberId);
    const m = await prisma.member.findUnique({ where: { id: memberId } });
    if (!m || m.guildId !== guildId) return res.status(404).json({ error: 'not found' });

    const prevTotal = m.totalXp;
    const prevText = m.textXp;
    const prevVoice = m.voiceXp;

    const data: any = { totalXp: { increment: Number(amount) } };
    if (type === 'text') data.textXp = { increment: Number(amount) };
    if (type === 'voice') data.voiceXp = { increment: Number(amount) };

    const updated = await prisma.member.update({ where: { id: memberId }, data });

    // create log
    try {
      await prisma.log.create({
        data: {
          guildId,
          action: 'add_xp',
          adminId: (req.user as any)?.id ?? 'UNKNOWN',
          targetMemberId: memberId,
          prevTotalXp: prevTotal,
          newTotalXp: updated.totalXp,
          prevTextXp: prevText,
          newTextXp: updated.textXp,
          prevVoiceXp: prevVoice,
          newVoiceXp: updated.voiceXp,
          details: JSON.stringify({ type, amount }),
        },
      });
    } catch (err) {
      console.error('failed to create add_xp log', err);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// POST /api/members/:guildId/:memberId/remove-xp { amount, type }
router.post('/:guildId/:memberId/remove-xp', ensureGuildManagePermission, async (req, res) => {
  try {
    const { amount, type } = req.body;
    const guildId = req.params.guildId;
    const memberId = Number(req.params.memberId);
    const m = await prisma.member.findUnique({ where: { id: memberId } });
    if (!m || m.guildId !== guildId) return res.status(404).json({ error: 'not found' });

    const prevTotal = m.totalXp;
    const prevText = m.textXp;
    const prevVoice = m.voiceXp;

    const data: any = { totalXp: { decrement: Number(amount) } };
    if (type === 'text') data.textXp = { decrement: Number(amount) };
    if (type === 'voice') data.voiceXp = { decrement: Number(amount) };

    const updated = await prisma.member.update({ where: { id: memberId }, data });

    // create log
    try {
      await prisma.log.create({
        data: {
          guildId,
          action: 'remove_xp',
          adminId: (req.user as any)?.id ?? 'UNKNOWN',
          targetMemberId: memberId,
          prevTotalXp: prevTotal,
          newTotalXp: updated.totalXp,
          prevTextXp: prevText,
          newTextXp: updated.textXp,
          prevVoiceXp: prevVoice,
          newVoiceXp: updated.voiceXp,
          details: JSON.stringify({ type, amount }),
        },
      });
    } catch (err) {
      console.error('failed to create remove_xp log', err);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// POST /api/members/:guildId/:memberId/reset
router.post('/:guildId/:memberId/reset', ensureGuildManagePermission, async (req, res) => {
  try {
    const guildId = req.params.guildId;
    const memberId = Number(req.params.memberId);
    const m = await prisma.member.findUnique({ where: { id: memberId } });
    if (!m || m.guildId !== guildId) return res.status(404).json({ error: 'not found' });

    const prevTotal = m.totalXp;
    const prevText = m.textXp;
    const prevVoice = m.voiceXp;
    const prevLevel = m.level;

    const updated = await prisma.member.update({ where: { id: memberId }, data: { totalXp: 0, textXp: 0, voiceXp: 0, level: 1 } });

    try {
      await prisma.log.create({
        data: {
          guildId,
          action: 'reset_xp',
          adminId: (req.user as any)?.id ?? 'UNKNOWN',
          targetMemberId: memberId,
          prevTotalXp: prevTotal,
          newTotalXp: updated.totalXp,
          prevTextXp: prevText,
          newTextXp: updated.textXp,
          prevVoiceXp: prevVoice,
          newVoiceXp: updated.voiceXp,
          prevLevel,
          newLevel: updated.level,
          details: JSON.stringify({ reason: 'manual_reset' }),
        },
      });
    } catch (err) {
      console.error('failed to create reset_xp log', err);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// GET /api/leaderboard/:guildId?type=text|voice|level
router.get('/leaderboard/:guildId', ensureGuildManagePermission, async (req, res) => {
  try {
    const guildId = req.params.guildId;
    const type = String(req.query.type || 'level');
    let rows;
    if (type === 'voice') rows = await prisma.member.findMany({ where: { guildId }, orderBy: { voiceXp: 'desc' }, take: 50 });
    else if (type === 'text') rows = await prisma.member.findMany({ where: { guildId }, orderBy: { textXp: 'desc' }, take: 50 });
    else rows = await prisma.member.findMany({ where: { guildId }, orderBy: [{ level: 'desc' }, { totalXp: 'desc' }], take: 50 });

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// GET /api/settings/:guildId
router.get('/settings/:guildId', ensureGuildManagePermission, async (req, res) => {
  try {
    const guildId = req.params.guildId;
    const g = await prisma.guild.findUnique({ where: { guildId } });
    res.json(g);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// POST /api/settings/:guildId update settings
router.post('/settings/:guildId', ensureGuildManagePermission, async (req, res) => {
  try {
    const guildId = req.params.guildId;
    const payload = req.body;
    const data: any = {};
    if (payload.textXpPerMessage !== undefined) data.textXpPerMessage = Number(payload.textXpPerMessage);
    if (payload.textXpCooldown !== undefined) data.textXpCooldown = Number(payload.textXpCooldown);
    if (payload.voiceXpPerMinute !== undefined) data.voiceXpPerMinute = Number(payload.voiceXpPerMinute);

    const before = await prisma.guild.findUnique({ where: { guildId } });
    const g = await prisma.guild.upsert({ where: { guildId }, update: data, create: { guildId, ...data } });

    try {
      await prisma.log.create({
        data: {
          guildId,
          action: 'edit_settings',
          adminId: (req.user as any)?.id ?? 'UNKNOWN',
          prevTotalXp: undefined,
          newTotalXp: undefined,
          details: JSON.stringify({ before, after: g }),
        },
      });
    } catch (err) {
      console.error('failed to create edit_settings log', err);
    }

    res.json(g);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

export default router;
