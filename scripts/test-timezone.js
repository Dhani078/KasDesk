const { getMonthWindow } = require('../lib/timezone.ts');

let pass = 0, fail = 0;
const check = (n, c, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}`); }
  else { fail++; console.log(`  FAIL  ${n} ${d ? '-> ' + d : ''}`); }
};

console.log('=== Timezone Makassar Boundary Tests ===');

// 1. Midnight on 1st of January 2027 in Asia/Makassar (UTC+8) is 2026-12-31T16:00:00.000Z
const jan1 = new Date('2026-12-31T16:00:00.000Z');
const wJan = getMonthWindow(jan1, 'Asia/Makassar');
check('Jan 1 00:00 Makassar month is 2027-01', wJan.month === '2027-01', `got ${wJan.month}`);
check('Jan 1 00:00 Makassar start is 2026-12-31T16:00:00.000Z', wJan.start.toISOString() === '2026-12-31T16:00:00.000Z', `got ${wJan.start.toISOString()}`);
check('Jan 1 00:00 Makassar end is 2027-01-31T16:00:00.000Z', wJan.end.toISOString() === '2027-01-31T16:00:00.000Z', `got ${wJan.end.toISOString()}`);
check('Jan 1 00:00 Makassar daysLeft is 31', wJan.daysLeft === 31, `got ${wJan.daysLeft}`);

// 2. 23:59:59 on Dec 31 in Asia/Makassar (15:59:59 UTC) must still be 2026-12
const dec31End = new Date('2026-12-31T15:59:59.000Z');
const wDec = getMonthWindow(dec31End, 'Asia/Makassar');
check('Dec 31 23:59 Makassar month is 2026-12', wDec.month === '2026-12', `got ${wDec.month}`);
check('Dec 31 23:59 Makassar start is 2026-11-30T16:00:00.000Z', wDec.start.toISOString() === '2026-11-30T16:00:00.000Z', `got ${wDec.start.toISOString()}`);
check('Dec 31 23:59 Makassar daysLeft is 1', wDec.daysLeft === 1, `got ${wDec.daysLeft}`);

console.log(`\n==============================================`);
console.log(`RESULT: ${pass} passed, ${fail} failed`);
console.log(`==============================================`);
process.exit(fail ? 1 : 0);
