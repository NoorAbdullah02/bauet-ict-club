// Starts the real server on an in-memory PostgreSQL (pg-mem), so the whole API can be tested with no database account. Used by `npm run qa`.
const path = require('path');
const http = require('http');
const { newDb } = require('pg-mem');
const pg = newDb().adapters.createPg();
if (!pg.types) pg.types = { setTypeParser() {} };
const id = require.resolve('pg');
require.cache[id] = { id, filename: id, loaded: true, exports: pg, children: [], paths: [] };
const QA_PORT = process.env.QA_PORT || '5099';
Object.assign(process.env, {
  PORT: QA_PORT, API_RATE_MAX: '5000', NODE_ENV: 'production', TRUST_PROXY: '1', SEED_SAMPLES: 'true', SEED_COMMITTEE: 'true', SEED_FAQS: 'true',
  PUBLIC_URL: `http://localhost:${QA_PORT}`, ADMIN_PASSWORD: 'Qa-Pass-12345', ADMIN_USERNAME: process.env.QA_ADMIN_USERNAME || 'admin',
  JWT_SECRET: 'qa-fixed-secret-for-the-regression-check-1234567890', CRON_SECRET: 'qa-cron-secret-123456',
  DATABASE_URL: 'postgres://qa', BREVO_API_KEY: process.env.QA_BREVO_KEY || '', SMTP_HOST: '',
});
// empty, not deleted: dotenv would put the real .env keys back, and the suite must never upload to the club's Cloudinary account
process.env.CLOUDINARY_CLOUD_NAME = ''; process.env.CLOUDINARY_API_KEY = ''; process.env.CLOUDINARY_API_SECRET = '';

// A stand-in for Cloudinary. The suite needs the cloud upload path as well as the disk one, but the club's
// real account must never be touched, so this module answers instead of the SDK and remembers what it was sent.
// `npm run qa` switches the two modes through the little control server below (QA_PORT + 1).
const cloudCalls = [];
const stubUrl = (n) => `https://res.cloudinary.com/qa-cloud/image/upload/qa-${n}.webp`;
const fakeCloudinary = {
  config: () => {},
  uploader: {
    upload_stream: (options, callback) => {
      const chunks = [];
      return {
        on() { return this; },
        end(buffer) {
          chunks.push(Buffer.from(buffer));
          const n = cloudCalls.length + 1;
          cloudCalls.push({ kind: 'stream', folder: options.folder, format: options.format, transformation: options.transformation, bytes: chunks.reduce((sum, c) => sum + c.length, 0) });
          callback(null, { secure_url: stubUrl(n), public_id: `${options.folder}/qa-${n}` });
        },
      };
    },
    upload: async (source, options = {}) => {
      const n = cloudCalls.length + 1;
      cloudCalls.push({ kind: 'upload', folder: options.folder, background_removal: options.background_removal || null, bytes: typeof source === 'string' ? source.length : 0 });
      return { secure_url: stubUrl(n), public_id: `qa-${n}` };
    },
    destroy: async (publicId) => { cloudCalls.push({ kind: 'destroy', public_id: publicId }); return { result: 'ok' }; },
  },
  api: {
    ping: async () => ({ status: 'ok' }),
    resource: async () => { throw Object.assign(new Error('Resource not found'), { http_code: 404 }); },
  },
};
const cloudPath = require.resolve(path.join(__dirname, '..', 'config', 'cloudinary'));
require.cache[cloudPath] = { id: cloudPath, filename: cloudPath, loaded: true, exports: fakeCloudinary, children: [], paths: [] };

const CONTROL_PORT = Number(process.env.QA_CONTROL_PORT || Number(QA_PORT) + 1);
http.createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://qa');
  if (pathname === '/cloudinary/on') Object.assign(process.env, { CLOUDINARY_CLOUD_NAME: 'qa-cloud', CLOUDINARY_API_KEY: 'qa-key', CLOUDINARY_API_SECRET: 'qa-secret' });
  else if (pathname === '/cloudinary/off') Object.assign(process.env, { CLOUDINARY_CLOUD_NAME: '', CLOUDINARY_API_KEY: '', CLOUDINARY_API_SECRET: '' });
  else if (pathname === '/cloudinary/reset') cloudCalls.length = 0;
  else if (pathname === '/cloudinary/calls') { res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify(cloudCalls)); }
  else if (pathname === '/trash/age') {
    // backdate one trashed row so the retention sweep has something it must remove
    const q = new URL(req.url, 'http://qa').searchParams;
    const table = q.get('table') || '';
    const days = Math.max(0, Math.floor(Number(q.get('days')) || 0));
    const rowId = Math.floor(Number(q.get('id')) || 0);
    const tables = ['events', 'notices', 'members', 'gallery', 'achievements', 'posts', 'event_registrations', 'messages', 'registrations'];
    res.setHeader('content-type', 'application/json');
    if (!tables.includes(table) || !rowId) { res.statusCode = 400; return res.end(JSON.stringify({ ok: false, error: 'unknown table or id' })); }
    return require(path.join(__dirname, '..', 'config', 'db'))
      .query(`UPDATE ${table} SET deleted_at = NOW() - INTERVAL '${days} days' WHERE id = $1`, [rowId])
      .then((r) => res.end(JSON.stringify({ ok: true, rows: r.rowCount })))
      .catch((e) => { res.statusCode = 500; res.end(JSON.stringify({ ok: false, error: e.message })); });
  }
  else if (pathname === '/trash/purge') {
    // the same sweep the server runs on boot, so the suite can check the row and its file both go
    res.setHeader('content-type', 'application/json');
    return require(path.join(__dirname, '..', 'routes', 'trash')).purgeExpired()
      .then(() => res.end('{"ok":true}'))
      .catch((e) => { res.statusCode = 500; res.end(JSON.stringify({ ok: false, error: e.message })); });
  }
  res.setHeader('content-type', 'application/json');
  res.end('{"ok":true}');
}).listen(CONTROL_PORT, '127.0.0.1');

require(path.join(__dirname, '..', 'index.js'));
