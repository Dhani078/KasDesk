const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const env = {};
for (const line of fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["'](.*)["']$/, '$1');
}

(async () => {
  let c;
  try {
    c = await mysql.createConnection({
      host: env.DATABASE_HOST,
      port: Number(env.DATABASE_PORT),
      user: env.DATABASE_USER,
      password: env.DATABASE_PASSWORD,
      database: env.DATABASE_NAME,
      ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
      multipleStatements: true,
      connectTimeout: 30000,
    });
    const sql = fs.readFileSync(path.join(__dirname, '..', 'drizzle', '0000_init.sql'), 'utf8');
    await c.query(sql);
    const [t] = await c.query('SHOW TABLES');
    console.log('MIGRATION OK ->', t.map(r => Object.values(r)[0]).join(','));
  } catch (e) {
    console.error('MIGRATION FAIL:', e.code, e.message);
    process.exit(1);
  } finally {
    if (c) await c.end();
  }
})();
