/**
 * Database integration and multi-tenant isolation suite for Shared Financial Spaces (EPIC 6).
 *
 * Verifies:
 *   1. Atomic space creation in sharedSpaces with owner attribution.
 *   2. Owner membership creation in spaceMembers with role = 'owner'.
 *   3. Unique constraint enforcement on (spaceId, userId) pair.
 *   4. Member invitation with role = 'editor'.
 *   5. Multi-tenant isolation: owner and member see the space; third-party user sees 0 spaces.
 *   6. Space-scoped wallet creation and ledger partitioning.
 *   7. Transaction audit trail: spaceId attribution and createdByUserId tagging.
 *   8. Member role elevation / demotion in spaceMembers.
 *   9. Member departure / removal from space.
 *  10. Space deletion and clean membership teardown.
 *
 * Run: node scripts/test-shared-spaces-db.js
 */
const fs = require('fs'), path = require('path')
const mysql = require('mysql2/promise')
const crypto = require('crypto')

function loadEnv(f) {
  const o = {}
  if (!fs.existsSync(f)) return o
  for (const raw of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = raw.trim().match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) o[m[1]] = m[2].trim()
  }
  return o
}
const env = loadEnv(path.join(__dirname, '..', '.env.local'))

let pass = 0, fail = 0
const check = (n, c, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}`) }
  else { fail++; console.log(`  FAIL  ${n} ${d ? '→ ' + d : ''}`) }
}

const sql = () => mysql.createPool({
  host: env.DATABASE_HOST, port: Number(env.DATABASE_PORT),
  user: env.DATABASE_USER, password: env.DATABASE_PASSWORD,
  database: env.DATABASE_NAME,
  ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
})

;(async () => {
  console.log('=== Shared Financial Spaces Database Integration Tests (EPIC 6) ===\n')
  const db = sql()

  const userA = crypto.randomUUID()
  const userB = crypto.randomUUID()
  const userC = crypto.randomUUID()
  const spaceId = crypto.randomUUID()
  const memberRowA = crypto.randomUUID()
  const memberRowB = crypto.randomUUID()
  const walletId = crypto.randomUUID()
  const txId = crypto.randomUUID()

  try {
    // 0. Setup test users
    await db.execute('INSERT INTO users (id, email, name, passwordHash) VALUES (?, ?, ?, ?)',
      [userA, `owner-${Date.now()}@example.com`, 'Owner Alice', 'hashA'])
    await db.execute('INSERT INTO users (id, email, name, passwordHash) VALUES (?, ?, ?, ?)',
      [userB, `member-${Date.now()}@example.com`, 'Member Bob', 'hashB'])
    await db.execute('INSERT INTO users (id, email, name, passwordHash) VALUES (?, ?, ?, ?)',
      [userC, `stranger-${Date.now()}@example.com`, 'Stranger Charlie', 'hashC'])

    // 1. Create shared space
    await db.execute(
      'INSERT INTO sharedSpaces (id, name, description, ownerUserId) VALUES (?, ?, ?, ?)',
      [spaceId, 'Kas Rumah Tangga Kita', 'Anggaran belanja dapur bersama', userA]
    )
    const [spaces] = await db.execute('SELECT * FROM sharedSpaces WHERE id = ?', [spaceId])
    check('sharedSpaces row created successfully', spaces.length === 1)
    check('sharedSpace owner matches userA', spaces[0].ownerUserId === userA)
    check('sharedSpace name matches input', spaces[0].name === 'Kas Rumah Tangga Kita')

    // 2. Assign creator as owner in spaceMembers
    await db.execute(
      'INSERT INTO spaceMembers (id, spaceId, userId, role) VALUES (?, ?, ?, ?)',
      [memberRowA, spaceId, userA, 'owner']
    )
    const [membersA] = await db.execute('SELECT * FROM spaceMembers WHERE spaceId = ? AND userId = ?', [spaceId, userA])
    check('owner membership recorded with role=owner', membersA.length === 1 && membersA[0].role === 'owner')

    // 3. Unique index rejects duplicate membership for same user in same space
    let dupFailed = false
    try {
      await db.execute(
        'INSERT INTO spaceMembers (id, spaceId, userId, role) VALUES (?, ?, ?, ?)',
        [crypto.randomUUID(), spaceId, userA, 'owner']
      )
    } catch (_err) {
      dupFailed = true
    }
    check('uniqueIndex (spaceId, userId) prevents duplicate membership', dupFailed)

    // 4. Invite member B as editor
    await db.execute(
      'INSERT INTO spaceMembers (id, spaceId, userId, role) VALUES (?, ?, ?, ?)',
      [memberRowB, spaceId, userB, 'editor']
    )
    const [membersB] = await db.execute('SELECT * FROM spaceMembers WHERE spaceId = ? AND userId = ?', [spaceId, userB])
    check('invited member recorded with role=editor', membersB.length === 1 && membersB[0].role === 'editor')

    // 5. Query spaces per user (multi-tenant check)
    const [userASpaces] = await db.execute(
      `SELECT s.id, s.name, m.role
       FROM spaceMembers m
       INNER JOIN sharedSpaces s ON m.spaceId = s.id
       WHERE m.userId = ?`,
      [userA]
    )
    const [userBSpaces] = await db.execute(
      `SELECT s.id, s.name, m.role
       FROM spaceMembers m
       INNER JOIN sharedSpaces s ON m.spaceId = s.id
       WHERE m.userId = ?`,
      [userB]
    )
    const [userCSpaces] = await db.execute(
      `SELECT s.id, s.name, m.role
       FROM spaceMembers m
       INNER JOIN sharedSpaces s ON m.spaceId = s.id
       WHERE m.userId = ?`,
      [userC]
    )
    check('User A sees shared space as owner', userASpaces.length === 1 && userASpaces[0].role === 'owner')
    check('User B sees shared space as editor', userBSpaces.length === 1 && userBSpaces[0].role === 'editor')
    check('User C has zero access to shared space (tenant isolation)', userCSpaces.length === 0)

    // 6. Space-scoped wallet creation
    await db.execute(
      'INSERT INTO wallets (id, userId, spaceId, name, type, balance) VALUES (?, ?, ?, ?, ?, ?)',
      [walletId, userA, spaceId, 'Rekening Bersama', 'bank', 5000000]
    )
    const [spaceWallets] = await db.execute('SELECT * FROM wallets WHERE spaceId = ?', [spaceId])
    check('wallet correctly linked to shared spaceId', spaceWallets.length === 1 && spaceWallets[0].spaceId === spaceId)

    // 7. Transaction in shared space with createdByUserId attribution
    await db.execute(
      `INSERT INTO transactions
       (id, userId, spaceId, createdByUserId, walletId, type, amount, title)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [txId, userA, spaceId, userB, walletId, 'expense', 150000, 'Belanja Mingguan Supermarket']
    )
    const [txRows] = await db.execute('SELECT * FROM transactions WHERE id = ?', [txId])
    check('transaction recorded under spaceId', txRows.length === 1 && txRows[0].spaceId === spaceId)
    check('transaction tracks createdByUserId attribution', txRows[0].createdByUserId === userB)

    // 8. Update member role: promote/demote
    await db.execute(
      'UPDATE spaceMembers SET role = ? WHERE spaceId = ? AND userId = ?',
      ['viewer', spaceId, userB]
    )
    const [demotedB] = await db.execute('SELECT role FROM spaceMembers WHERE spaceId = ? AND userId = ?', [spaceId, userB])
    check('member role successfully updated to viewer', demotedB[0]?.role === 'viewer')

    // 9. Remove member B from space
    await db.execute('DELETE FROM spaceMembers WHERE spaceId = ? AND userId = ?', [spaceId, userB])
    const [remainingMembers] = await db.execute('SELECT * FROM spaceMembers WHERE spaceId = ?', [spaceId])
    check('member B removed; only owner remains in spaceMembers', remainingMembers.length === 1 && remainingMembers[0].userId === userA)

    // 10. Space deletion & cleanup
    await db.execute('DELETE FROM transactions WHERE id = ?', [txId])
    await db.execute('DELETE FROM wallets WHERE id = ?', [walletId])
    await db.execute('DELETE FROM spaceMembers WHERE spaceId = ?', [spaceId])
    await db.execute('DELETE FROM sharedSpaces WHERE id = ?', [spaceId])

    const [deletedSpaces] = await db.execute('SELECT * FROM sharedSpaces WHERE id = ?', [spaceId])
    const [deletedMembers] = await db.execute('SELECT * FROM spaceMembers WHERE spaceId = ?', [spaceId])
    check('sharedSpace cleaned up', deletedSpaces.length === 0)
    check('spaceMembers cleaned up', deletedMembers.length === 0)

  } finally {
    // Teardown test fixtures
    try {
      await db.execute('DELETE FROM transactions WHERE id = ?', [txId])
      await db.execute('DELETE FROM wallets WHERE id = ?', [walletId])
      await db.execute('DELETE FROM spaceMembers WHERE spaceId = ?', [spaceId])
      await db.execute('DELETE FROM sharedSpaces WHERE id = ?', [spaceId])
      await db.execute('DELETE FROM users WHERE id IN (?, ?, ?)', [userA, userB, userC])
    } catch {}
    await db.end()
  }

  console.log(`\n==============================================`)
  console.log(`RESULT: ${pass} passed, ${fail} failed`)
  console.log(`==============================================`)

  if (fail > 0) process.exit(1)
  process.exit(0)
})()
