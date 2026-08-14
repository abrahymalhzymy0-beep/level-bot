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

// GET /api/logs/:guildId?page=&perPage=&action=&adminId=&memberId=&from=&to=&q=
router.get('/:guildId', ensureGuildManagePermission, async (req, res) => {
  try {
    const guildId = req.params.guildId;
    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = Math.min(100, Number(req.query.perPage) || 20);
    const action = req.query.action as string | undefined;
    const adminId = req.query.adminId as string | undefined;
    const memberId = req.query.memberId ? Number(req.query.memberId) : undefined;
    const q = req.query.q as string | undefined;
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;

    const where: any = { guildId };
    if (action) where.action = action;
    if (adminId) where.adminId = adminId;
    if (memberId) where.targetMemberId = memberId;
    if (from || to) where.createdAt = {};
    if (from) where.createdAt.gte = from;
    if (to) where.createdAt.lte = to;
    if (q) {
      where.OR = [
        { details: { contains: q } },
        // allow searching numeric ids
        { adminId: { contains: q } },
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.log.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * perPage, take: perPage }),
      prisma.log.count({ where }),
    ]);

    res.json({ rows, page, perPage, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// GET /api/logs/:guildId/:logId
router.get('/:guildId/:logId', ensureGuildManagePermission, async (req, res) => {
  try {
    const logId = Number(req.params.logId);
    const l = await prisma.log.findUnique({ where: { id: logId } });
    if (!l || l.guildId !== req.params.guildId) return res.status(404).json({ error: 'not found' });
    res.json(l);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

export default router;
