const { Pool, types } = require('pg');
types.setTypeParser(1082, (v) => v); // DATE -> '2026-11-05', no timezone shifting
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/bauet_ict_club',
  max: 8,
  idleTimeoutMillis: 10000, // Neon closes idle connections on its side; give them up before it does
  connectionTimeoutMillis: 20000, // Neon can take a few seconds to wake up
  keepAlive: true,
  keepAliveInitialDelayMillis: 5000,
});

// An idle connection that the database closes emits "error" on the pool. With no listener Node would CRASH the whole
// server (and every visitor would see errors until Render restarts it). Log it and carry on: the pool opens a new connection.
pool.on('error', (e) => console.warn('database connection dropped (a new one is opened when needed):', e.message));

const TRANSIENT = /terminat|ECONNRESET|ETIMEDOUT|EPIPE|Connection (ended|closed)|server closed the connection|timeout exceeded when trying to connect|57P0[1-3]|08006|08003/i;
const isTransient = (e) => !!e && (TRANSIENT.test(String(e.message || '')) || TRANSIENT.test(String(e.code || '')));

// one quiet retry for a request that hit a connection the database had just closed
const rawQuery = pool.query.bind(pool);
pool.query = async (...args) => {
  try {
    return await rawQuery(...args);
  } catch (e) {
    if (!isTransient(e) || typeof args[args.length - 1] === 'function') throw e;
    await new Promise((r) => setTimeout(r, 300));
    return rawQuery(...args);
  }
};

module.exports = pool;
