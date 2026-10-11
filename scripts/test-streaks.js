const { computeStreaks } = require('../lib/analytics/streaks.ts');

let pass = 0, fail = 0;
const check = (n, c, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}`); }
  else { fail++; console.log(`  FAIL  ${n} ${d ? '-> ' + d : ''}`); }
};

console.log('=== Streak Tracker Unit Tests ===');

// Helper: create date at noon UTC for a given YYYY-MM-DD
const d = (s) => new Date(s + 'T04:00:00.000Z'); // noon in Asia/Makassar (UTC+8)

// 1. Empty dates
{
  const r = computeStreaks([], new Date('2026-10-11T04:00:00.000Z'));
  check('empty → current=0', r.current === 0, `got ${r.current}`);
  check('empty → best=0', r.best === 0, `got ${r.best}`);
  check('empty → totalDays=0', r.totalDays === 0, `got ${r.totalDays}`);
}

// 2. Single day = today
{
  const now = new Date('2026-10-11T04:00:00.000Z');
  const r = computeStreaks([d('2026-10-11')], now);
  check('single today → current=1', r.current === 1, `got ${r.current}`);
  check('single today → best=1', r.best === 1, `got ${r.best}`);
}

// 3. Consecutive 5 days ending today
{
  const now = new Date('2026-10-11T04:00:00.000Z');
  const dates = [d('2026-10-07'), d('2026-10-08'), d('2026-10-09'), d('2026-10-10'), d('2026-10-11')];
  const r = computeStreaks(dates, now);
  check('5 consecutive → current=5', r.current === 5, `got ${r.current}`);
  check('5 consecutive → best=5', r.best === 5, `got ${r.best}`);
  check('5 consecutive → totalDays=5', r.totalDays === 5, `got ${r.totalDays}`);
}

// 4. Gap in middle: 3 consecutive, gap, 2 consecutive ending today
{
  const now = new Date('2026-10-11T04:00:00.000Z');
  const dates = [d('2026-10-05'), d('2026-10-06'), d('2026-10-07'), d('2026-10-10'), d('2026-10-11')];
  const r = computeStreaks(dates, now);
  check('gap → current=2', r.current === 2, `got ${r.current}`);
  check('gap → best=3', r.best === 3, `got ${r.best}`);
  check('gap → totalDays=5', r.totalDays === 5, `got ${r.totalDays}`);
}

// 5. Last activity was yesterday (streak not broken yet)
{
  const now = new Date('2026-10-11T04:00:00.000Z');
  const dates = [d('2026-10-09'), d('2026-10-10')];
  const r = computeStreaks(dates, now);
  check('yesterday → current=2', r.current === 2, `got ${r.current}`);
}

// 6. Last activity was 2 days ago (streak broken)
{
  const now = new Date('2026-10-11T04:00:00.000Z');
  const dates = [d('2026-10-08'), d('2026-10-09')];
  const r = computeStreaks(dates, now);
  check('2 days ago → current=0', r.current === 0, `got ${r.current}`);
  check('2 days ago → best=2', r.best === 2, `got ${r.best}`);
}

// 7. Duplicate dates same day
{
  const now = new Date('2026-10-11T04:00:00.000Z');
  const dates = [d('2026-10-11'), d('2026-10-11'), d('2026-10-11')];
  const r = computeStreaks(dates, now);
  check('duplicates → current=1', r.current === 1, `got ${r.current}`);
  check('duplicates → totalDays=1', r.totalDays === 1, `got ${r.totalDays}`);
}

// 8. Timezone boundary: transaction at 23:30 Makassar (15:30 UTC) on Oct 10
{
  const now = new Date('2026-10-11T04:00:00.000Z');
  const lateNight = new Date('2026-10-10T15:30:00.000Z'); // 23:30 WITA
  const dates = [lateNight, d('2026-10-11')];
  const r = computeStreaks(dates, now);
  check('tz boundary → current=2', r.current === 2, `got ${r.current}`);
}

// 9. Transaction at 00:30 Makassar (16:30 UTC previous day) — counts as next day
{
  const now = new Date('2026-10-11T04:00:00.000Z');
  const earlyMorning = new Date('2026-10-10T16:30:00.000Z'); // 00:30 Oct 11 WITA
  const dates = [d('2026-10-10'), earlyMorning];
  const r = computeStreaks(dates, now);
  check('tz early morning → current=2', r.current === 2, `got ${r.current}`);
}

// 10. Unsorted input
{
  const now = new Date('2026-10-11T04:00:00.000Z');
  const dates = [d('2026-10-11'), d('2026-10-09'), d('2026-10-10')];
  const r = computeStreaks(dates, now);
  check('unsorted → current=3', r.current === 3, `got ${r.current}`);
}

console.log(`\n==============================================`);
console.log(`RESULT: ${pass} passed, ${fail} failed`);
console.log(`==============================================`);
process.exit(fail ? 1 : 0);
