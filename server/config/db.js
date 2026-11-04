const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/bauet_ict_club',
  max: 10,
  idleTimeoutMillis: 30000,
});

module.exports = pool;
