const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('MIGRATION FAIL: .env.local tidak ditemukan. Salin dari .env.example.');
  process.exit(1);
}
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["'](.*)["']$/, '$1');
}

(async () => {
  let c;
  try {
    c = await mysql.createConnection({
      host: env.DATABASE_HOST,
      port: Number(env.DATABASE_PORT || 4000),
      user: env.DATABASE_USER,
      password: env.DATABASE_PASSWORD,
      database: env.DATABASE_NAME,
      ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
      multipleStatements: true,
      connectTimeout: 30000,
    });
    await c.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) NOT NULL PRIMARY KEY,
      checksum CHAR(64) NOT NULL,
      appliedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    const dir = path.join(root, 'drizzle');
    const files = fs.readdirSync(dir).filter((f) => /^\d+.*\.sql$/.test(f)).sort();
    for (const name of files) {
      const sql = fs.readFileSync(path.join(dir, name), 'utf8');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');
      const [rows] = await c.query('SELECT checksum FROM schema_migrations WHERE name = ?', [name]);
      if (rows.length) {
        if (rows[0].checksum !== checksum) throw new Error(`Migration berubah setelah diterapkan: ${name}`);
        console.log('SKIP', name);
        continue;
      }
      await c.beginTransaction();
      try {
        await c.query(sql);
        await c.query('INSERT INTO schema_migrations (name, checksum) VALUES (?, ?)', [name, checksum]);
        await c.commit();
        console.log('APPLIED', name);
      } catch (error) {
        await c.rollback();
        throw error;
      }
    }
    console.log('MIGRATION OK');
  } catch (e) {
    console.error('MIGRATION FAIL:', e.code || 'ERROR', e.message);
    process.exitCode = 1;
  } finally {
    if (c) await c.end();
  }
})();
