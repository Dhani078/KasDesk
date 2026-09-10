/**
 * Seeds a realistic demo user so the UI can be verified with real data.
 * Idempotent: re-running resets that user's data.
 */
const fs = require('fs'), path = require('path')
const mysql = require('mysql2/promise')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

function loadEnv(f) {
  const o = {}
  for (const raw of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const l = raw.trim(); const m = l.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) o[m[1]] = m[2].trim()
  }
  return o
}
const env = loadEnv(path.join(__dirname, '..', '.env.local'))
const EMAIL = 'demo@kasdesk.test'
const PW = 'demo12345'

;(async () => {
  const db = await mysql.createPool({
    host: env.DATABASE_HOST, port: Number(env.DATABASE_PORT),
    user: env.DATABASE_USER, password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
  })

  // wipe existing demo user
  const [old] = await db.execute('SELECT id FROM users WHERE email=?', [EMAIL])
  for (const u of old) {
    for (const t of ['categories','wallets','transactions','debts','vaults','sessions','accounts'])
      await db.execute(`DELETE FROM ${t} WHERE userId=?`, [u.id]).catch(() => {})
    await db.execute('DELETE FROM users WHERE id=?', [u.id])
  }

  const uid = crypto.randomUUID()
  await db.execute(
    `INSERT INTO users (id,email,name,passwordHash,locale,currency) VALUES (?,?,?,?,?,?)`,
    [uid, EMAIL, 'Demo Kasdesk', await bcrypt.hash(PW, 12), 'id-ID', 'IDR'],
  )
  console.log('user: ' + EMAIL + ' / ' + PW)

  // wallets
  const wallets = [
    { id: crypto.randomUUID(), name: 'Tunai', type: 'cash', balance: 450000 },
    { id: crypto.randomUUID(), name: 'BCA', type: 'bank', balance: 8250000 },
    { id: crypto.randomUUID(), name: 'GoPay', type: 'e_wallet', balance: 320000 },
  ]
  for (const w of wallets)
    await db.execute('INSERT INTO wallets (id,userId,name,type,balance) VALUES (?,?,?,?,?)',
      [w.id, uid, w.name, w.type, w.balance])
  console.log('wallets: ' + wallets.length)

  // categories
  const cats = ['MAKAN','TRANSPORT','BELANJA','TAGIHAN','HIBURAN','KESEHATAN','PENDIDIKAN','LAINNYA','GAJI']
  for (let i = 0; i < cats.length; i++)
    await db.execute('INSERT INTO categories (id,userId,name,kind,sortOrder,isSystem) VALUES (?,?,?,?,?,1)',
      [crypto.randomUUID(), uid, cats[i], cats[i] === 'GAJI' ? 'income' : cats[i] === 'LAINNYA' ? 'both' : 'expense', i + 1])

  // transactions across the last 8 days + this month
  const now = new Date()
  const tx = [
    ['expense', 35000, 'Nasi Goreng Gila', 'MAKAN', wallets[0].id, 0],
    ['expense', 120000, 'Isi bensin', 'TRANSPORT', wallets[1].id, 1],
    ['expense', 275000, 'Belanja bulanan', 'BELANJA', wallets[1].id, 2],
    ['expense', 45000, 'Kopi susu', 'MAKAN', wallets[2].id, 3],
    ['income', 8500000, 'Gaji bulan ini', 'GAJI', wallets[1].id, 4],
    ['expense', 350000, 'Listrik PLN', 'TAGIHAN', wallets[1].id, 5],
    ['expense', 60000, 'Nonton bioskop', 'HIBURAN', wallets[0].id, 6],
    ['expense', 180000, 'Obat & vitamin', 'KESEHATAN', wallets[2].id, 7],
    ['expense', 42000, 'Makan siang', 'MAKAN', wallets[0].id, 1],
    ['expense', 99000, 'Buku kuliah', 'PENDIDIKAN', wallets[1].id, 2],
  ]
  for (const [type, amount, title, cat, wid, daysAgo] of tx) {
    const d = new Date(now)
    d.setDate(d.getDate() - daysAgo)
    d.setHours(12, 0, 0, 0)
    await db.execute(
      `INSERT INTO transactions (id,userId,walletId,type,amount,title,categoryTag,occurredAt)
       VALUES (?,?,?,?,?,?,?,?)`,
      [crypto.randomUUID(), uid, wid, type, amount, title, cat, d],
    )
  }
  console.log('transactions: ' + tx.length)

  // vaults
  const vaults = [
    { name: 'Dana Darurat', target: 20000000, current: 6500000 },
    { name: 'Laptop Baru', target: 15000000, current: 3200000 },
  ]
  for (const v of vaults)
    await db.execute(
      `INSERT INTO vaults (id,userId,name,targetAmount,currentAmount) VALUES (?,?,?,?,?)`,
      [crypto.randomUUID(), uid, v.name, v.target, v.current],
    )
  console.log('vaults: ' + vaults.length)

  // debts
  const debts = [
    { direction: 'utang', person: 'Budi', amount: 500000, paid: 200000 },
    { direction: 'piutang', person: 'Sari', amount: 150000, paid: 0 },
  ]
  for (const d of debts)
    await db.execute(
      `INSERT INTO debts (id,userId,direction,personName,amount,paidAmount) VALUES (?,?,?,?,?,?)`,
      [crypto.randomUUID(), uid, d.direction, d.person, d.amount, d.paid],
    )
  console.log('debts: ' + debts.length)

  const [bal] = await db.execute('SELECT SUM(balance) t FROM wallets WHERE userId=? AND isArchived=0', [uid])
  console.log('total balance: ' + bal[0].t)
  await db.end()
})()
