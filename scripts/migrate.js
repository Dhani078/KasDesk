const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

const root = path.join(__dirname, '..');
const fileEnv = {};
const envPath = path.join(root, '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) fileEnv[m[1]] = m[2].trim().replace(/^["'](.*)["']$/, '$1');
  }
}
const env = { ...fileEnv, ...process.env };
const required = ['DATABASE_HOST', 'DATABASE_USER', 'DATABASE_PASSWORD', 'DATABASE_NAME'];
const missing = required.filter((key) => !env[key]);
if (missing.length) {
  console.error(`MIGRATION FAIL: konfigurasi belum lengkap (${missing.join(', ')}). Gunakan environment atau .env.local.`);
  process.exit(1);
}
if (!/^[A-Za-z0-9_]+$/.test(env.DATABASE_NAME)) {
  console.error('MIGRATION FAIL: DATABASE_NAME hanya boleh berisi huruf, angka, dan underscore.');
  process.exit(1);
}

(async () => {
  let c;
  try {
    c = await mysql.createConnection({
      host: env.DATABASE_HOST,
      port: Number(env.DATABASE_PORT || 4000),
      user: env.DATABASE_USER,
      password: env.DATABASE_PASSWORD,
      ssl: env.DATABASE_SSL === 'false' ? undefined : { minVersion: 'TLSv1.2', rejectUnauthorized: true },
      multipleStatements: true,
      connectTimeout: 30000,
      timezone: 'Z',
    });

    try {
      await c.query(`USE \`${env.DATABASE_NAME}\``);
    } catch (error) {
      if (error.code !== 'ER_BAD_DB_ERROR') throw error;
      await c.query(`CREATE DATABASE \`${env.DATABASE_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      await c.query(`USE \`${env.DATABASE_NAME}\``);
      console.log('CREATED DATABASE', env.DATABASE_NAME);
    }

    await c.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) NOT NULL PRIMARY KEY,
      checksum CHAR(64) NOT NULL,
      appliedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    const dir = path.join(root, 'drizzle');
    const files = fs.readdirSync(dir).filter((f) => /^\d+.*\.sql$/.test(f)).sort();
    if (!files.length) throw new Error('Tidak ada berkas migrasi.');
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
  } catch (error) {
    console.error('MIGRATION FAIL:', error.code || 'ERROR', error.message);
    process.exitCode = 1;
  } finally {
    if (c) await c.end();
  }
})();
