import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import session from 'express-session';
import cors from 'cors';
import passport from 'passport';
import path from 'path';
import { setupDiscordStrategy } from './auth';
import guildRoutes from './routes/guilds';
import memberRoutes from './routes/members';
import logsRoutes from './routes/logs';
import { prisma } from './lib/prisma';

const PORT = process.env.PORT ? Number(process.env.PORT) : Number(process.env.NOW_PORT) || 8080;

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

if (!process.env.SESSION_SECRET) {
  console.error('SESSION_SECRET is required');
  process.exit(1);
}

app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false }));

setupDiscordStrategy(passport);
app.use(passport.initialize());
app.use(passport.session());

// Auth endpoints
app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => {
  res.redirect(process.env.FRONTEND_URL || '/');
});

app.get('/auth/logout', (req, res) => {
  req.logout(() => {});
  res.redirect(process.env.FRONTEND_URL || '/');
});

// Protected API middleware
function ensureAuth(req: any, res: any, next: any) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  return res.status(401).json({ error: 'unauthorized' });
}

// Check that the user has MANAGE_GUILD or ADMINISTRATOR perms for the guildId param
function ensureGuildManagePermission(req: any, res: any, next: any) {
  const user = req.user as any;
  const guildId = req.params.guildId || req.body.guildId || req.query.guildId;
  if (!user || !user.guilds) return res.status(403).json({ error: 'forbidden' });
  const g = (user.guilds as any[]).find(x => x.id === guildId);
  if (!g) return res.status(403).json({ error: 'forbidden' });
  const perms = BigInt(g.permissions);
  const ADMIN = BigInt(0x8);
  const MANAGE_GUILD = BigInt(0x20);
  if ((perms & ADMIN) === ADMIN || (perms & MANAGE_GUILD) === MANAGE_GUILD) return next();
  return res.status(403).json({ error: 'forbidden' });
}

// Mount routes (protected)
app.use('/api/guilds', ensureAuth, guildRoutes);
app.use('/api/members', ensureAuth, memberRoutes);
app.use('/api/logs', ensureAuth, logsRoutes);

app.get('/api/me', ensureAuth, (req: any, res) => {
  res.json({ user: req.user });
});

// Serve built frontend in production
const distPath = path.join(__dirname, '..', '..', 'dashboard-frontend', 'dist');
if (process.env.SERVE_FRONTEND === 'true' || process.env.NODE_ENV === 'production') {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, async () => {
  console.log(`Dashboard backend listening on ${PORT}`);
  await prisma.$connect();
});
