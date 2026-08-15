const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbFile = process.env.DATABASE_FILE || './data/database.sqlite';
const dir = path.dirname(dbFile);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(dbFile);

/* Schema:
   xp: stores total xp per user per guild
*/
db.prepare(`
  CREATE TABLE IF NOT EXISTS xp (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    total_xp INTEGER NOT NULL DEFAULT 0,
    last_xp_at INTEGER,
    PRIMARY KEY (user_id, guild_id)
  )
`).run();

// Prepared statements
const getXpStmt = db.prepare('SELECT total_xp FROM xp WHERE user_id = ? AND guild_id = ?');
const upsertXpStmt = db.prepare(`
  INSERT INTO xp (user_id, guild_id, total_xp, last_xp_at)
  VALUES (@user_id, @guild_id, @total_xp, @last_xp_at)
  ON CONFLICT(user_id, guild_id) DO UPDATE SET
    total_xp = excluded.total_xp,
    last_xp_at = excluded.last_xp_at
`);
const leaderboardStmt = db.prepare('SELECT user_id, total_xp FROM xp WHERE guild_id = ? ORDER BY total_xp DESC LIMIT ?');

module.exports = {
  getUserXp: (userId, guildId) => {
    const row = getXpStmt.get(userId, guildId);
    return row ? row.total_xp : 0;
  },
  setUserXp: (userId, guildId, totalXp) => {
    upsertXpStmt.run({ user_id: userId, guild_id: guildId, total_xp: totalXp, last_xp_at: Date.now() });
  },
  getLeaderboard: (guildId, limit = 10) => {
    return leaderboardStmt.all(guildId, limit);
  },
  rawDb: db
};
