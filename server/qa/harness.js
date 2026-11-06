// Starts the real server on an in-memory PostgreSQL (pg-mem), so the whole API can be tested with no database account. Used by `npm run qa`.
const path = require('path');
const { newDb } = require('pg-mem');
const pg = newDb().adapters.createPg();
if (!pg.types) pg.types = { setTypeParser() {} };
const id = require.resolve('pg');
require.cache[id] = { id, filename: id, loaded: true, exports: pg, children: [], paths: [] };
Object.assign(process.env, {
  PORT: process.env.QA_PORT || '5099', API_RATE_MAX: '5000', NODE_ENV: 'production', TRUST_PROXY: '1', SEED_SAMPLES: 'true',
  PUBLIC_URL: `http://localhost:${process.env.QA_PORT || '5099'}`, ADMIN_PASSWORD: 'Qa-Pass-12345',
  JWT_SECRET: 'qa-fixed-secret-for-the-regression-check-1234567890', CRON_SECRET: 'qa-cron-secret-123456',
  DATABASE_URL: 'postgres://qa', BREVO_API_KEY: '', SMTP_HOST: '',
});
delete process.env.CLOUDINARY_CLOUD_NAME;
require(path.join(__dirname, '..', 'index.js'));
