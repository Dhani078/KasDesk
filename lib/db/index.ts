import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from './schema';

const globalForDb = globalThis as unknown as {
  __kasdeskPool?: mysql.Pool;
};

function createPool(): mysql.Pool {
  const pool = mysql.createPool({
    host: process.env.DATABASE_HOST!,
    port: Number(process.env.DATABASE_PORT ?? 4000),
    user: process.env.DATABASE_USER!,
    password: process.env.DATABASE_PASSWORD!,
    database: process.env.DATABASE_NAME ?? 'kasdesk',
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    waitForConnections: true,
    connectionLimit: 5,
    maxIdle: 5,
    idleTimeout: 60000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    timezone: '+00:00',
  });
  return pool;
}

// Reuse the pool across hot reloads in dev (prevents connection exhaustion)
const pool = globalForDb.__kasdeskPool ?? createPool();
if (process.env.NODE_ENV !== 'production') {
  globalForDb.__kasdeskPool = pool;
}

export const db = drizzle(pool, { schema, mode: 'default' });
export { pool };
export { schema };
