/**
 * Test Client-Side Encrypted Backup & Zero-Knowledge Restore (AES-256-GCM + PBKDF2).
 * Run: node scripts/test-encrypted-backup.js
 */
const { encryptBackup, decryptBackup } = require('../lib/crypto/backup')

let pass = 0
let fail = 0
const check = (name, cond, details = '') => {
  if (cond) {
    pass++
    console.log(`  PASS  ${name}`)
  } else {
    fail++
    console.log(`  FAIL  ${name} ${details ? '-> ' + details : ''}`)
  }
}

async function main() {
  console.log('=== Zero-Knowledge Client-Side Encrypted Backup Tests ===')

  const samplePayload = {
    exportedAt: '2026-10-06T00:00:00.000Z',
    user: { id: 'usr-123', email: 'user@kasdesk.test' },
    wallets: [{ id: 'w-1', name: 'BCA Utama', balance: 5000000 }],
    transactions: [
      { id: 'tx-1', amount: 50000, title: 'Kopi Susu', type: 'expense' },
      { id: 'tx-2', amount: 8000000, title: 'Gaji Bulanan', type: 'income' },
    ],
  }

  const goodPass = 'RahasiaSuperKuat123!'
  const wrongPass = 'PasswordSalahTotal!'

  // 1. Short passphrase rejected
  let shortRejected = false
  try {
    await encryptBackup(samplePayload, '123')
  } catch (_e) {
    shortRejected = true
  }
  check('passphrase < 6 chars rejected', shortRejected)

  // 2. Encryption produces valid armored container
  const armored = await encryptBackup(samplePayload, goodPass)
  check('armored backup is non-empty string', typeof armored === 'string' && armored.length > 100)

  const parsed = JSON.parse(armored)
  check('container has valid format header', parsed.format === 'kasdesk-encrypted-backup')
  check('container uses AES-256-GCM cipher', parsed.cipher === 'AES-256-GCM')
  check('container uses PBKDF2 KDF with 100k iters', parsed.kdf === 'PBKDF2' && parsed.iterations === 100000)
  check('plaintext is not exposed in ciphertext', !armored.includes('Kopi Susu') && !armored.includes('BCA Utama'))

  // 3. Successful decryption with correct password
  const decrypted = await decryptBackup(armored, goodPass)
  check('decrypted user matches', decrypted.user.id === 'usr-123')
  check('decrypted wallets count matches', decrypted.wallets.length === 1)
  check('decrypted transaction title matches', decrypted.transactions[0].title === 'Kopi Susu')
  check('decrypted transaction amount matches', decrypted.transactions[1].amount === 8000000)

  // 4. Incorrect password throws OperationError / rejection
  let wrongPassRejected = false
  try {
    await decryptBackup(armored, wrongPass)
  } catch (_e) {
    wrongPassRejected = true
  }
  check('wrong passphrase throws decryption rejection', wrongPassRejected)

  // 5. Tampered ciphertext throws error
  parsed.ciphertext = 'AAAA' + parsed.ciphertext.slice(4)
  const tamperedArmored = JSON.stringify(parsed)
  let tamperedRejected = false
  try {
    await decryptBackup(tamperedArmored, goodPass)
  } catch (_e) {
    tamperedRejected = true
  }
  check('tampered ciphertext fails integrity check', tamperedRejected)

  console.log(`\n==============================================\nRESULT: ${pass} passed, ${fail} failed\n==============================================`)
  process.exit(fail ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
