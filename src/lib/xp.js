// Functions to compute XP <-> Level. Formula chosen for harder, balanced progression.
//
// xpNeededForLevel(n) = floor(100 * n^1.5)
// We treat stored xp as total cumulative XP. levelForXp iteratively subtracts
// xpNeededForLevel(level+1) until remainder < next required XP.

function xpNeededForLevel(level) {
  // xp required to go from `level` to `level+1` (level >= 0)
  // level 0 -> level 1 uses xpNeededForLevel(1)
  return Math.floor(100 * Math.pow(level, 1.5));
}

function levelForXp(totalXp) {
  let level = 0;
  let xpRemaining = totalXp;
  while (true) {
    const nextNeeded = xpNeededForLevel(level + 1);
    if (xpRemaining >= nextNeeded) {
      xpRemaining -= nextNeeded;
      level += 1;
    } else {
      return {
        level,
        xpIntoLevel: xpRemaining,
        xpForNext: nextNeeded
      };
    }
  }
}

module.exports = {
  xpNeededForLevel,
  levelForXp
};
