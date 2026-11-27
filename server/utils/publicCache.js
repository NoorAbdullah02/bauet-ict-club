const crypto = require('crypto');
const { isAdminRequest } = require('../middleware/auth');

/**
 * In-memory JSON + ETag cache for public GET endpoints.
 * Keeps PostgreSQL roundtrips at zero for repeat visitors and returns instant 304 responses
 * when the browser/app already holds the current snapshot. Cleared automatically on every write
 * via dataVersion.bump() and whenever scheduled posts go live.
 */
const entries = new Map();

const hash = (str) => crypto.createHash('sha1').update(str).digest('base64url').slice(0, 16);

function clear() {
  entries.clear();
}

async function isAdmin(req) {
  if (!req.headers?.authorization) return false;
  return isAdminRequest(req);
}

/**
 * Serve a public JSON endpoint from memory for anonymous GET requests.
 * Admin requests (with a valid Bearer token) and `?_=...` cache-busted requests bypass reads.
 */
async function serve(key, req, res, loader, opts = {}) {
  const ttlMs = opts.ttlMs ?? 300000;
  const admin = await isAdmin(req);
  const bypass = admin || (req.query && req.query._ !== undefined);

  if (!bypass) {
    const hit = entries.get(key);
    if (hit && hit.expiresAt > Date.now()) {
      res.set('ETag', hit.etag);
      if (req.get('if-none-match') === hit.etag) return res.status(304).end();
      res.set('X-Cache', 'HIT');
      return res.type('application/json').send(hit.json);
    }
  }

  const data = await loader(admin);
  const json = JSON.stringify(data);

  if (!admin) {
    const etag = `W/"${hash(json)}"`;
    if (entries.size > 100) entries.clear();
    entries.set(key, { json, etag, expiresAt: Date.now() + ttlMs });
    res.set('ETag', etag);
    if (!bypass && req.get('if-none-match') === etag) return res.status(304).end();
  }

  res.set('X-Cache', bypass ? 'BYPASS' : 'MISS');
  return res.type('application/json').send(json);
}

module.exports = { serve, clear };
