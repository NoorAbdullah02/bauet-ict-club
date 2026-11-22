const { ZipArchive } = require('archiver');
const { dump } = require('./backupData');

async function zipEntriesToBuffer(entries) {
  return new Promise((resolve, reject) => {
    const zip = new ZipArchive({ zlib: { level: 6 } });
    const chunks = [];
    zip.on('data', (c) => chunks.push(c));
    zip.on('end', () => resolve(Buffer.concat(chunks)));
    zip.on('error', reject);
    for (const e of entries) {
      zip.append(Buffer.isBuffer(e.data) ? e.data : Buffer.from(String(e.data)), { name: e.name });
    }
    zip.finalize();
  });
}

/**
 * Creates a database backup dump, zips it, and sends it directly
 * into the authorized Telegram admin chat/group as a document.
 */
async function sendBackupToTelegram({ caption } = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) {
    return { ok: false, error: 'Telegram bot credentials not configured' };
  }

  try {
    const entries = await dump();
    const zipBuf = await zipEntriesToBuffer(entries);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `bauet-ict-club-backup-${dateStr}.zip`;

    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('caption', caption || `📦 <b>BAUET ICT Club Database Backup</b>\n📅 <i>${dateStr}</i>\n📁 Tables: ${entries.length - 1} | Size: ${(zipBuf.length / 1024).toFixed(1)} KB`);
    form.append('parse_mode', 'HTML');
    form.append('document', new Blob([zipBuf], { type: 'application/zip' }), filename);

    const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn('Telegram backup send failed:', errText);
      return { ok: false, error: errText };
    }

    return { ok: true, size: zipBuf.length, filename };
  } catch (err) {
    console.warn('sendBackupToTelegram error:', err.message);
    return { ok: false, error: err.message };
  }
}

let lastBackupTime = 0;

/**
 * Runs at most once per 24 hours when scheduled jobs are triggered.
 */
async function maybeDailyBackup() {
  const now = Date.now();
  if (now - lastBackupTime < 23 * 60 * 60 * 1000) return;
  lastBackupTime = now;
  return sendBackupToTelegram({ caption: '📦 <b>Daily Scheduled Database Backup</b>\nNightly automated snapshot' });
}

module.exports = {
  sendBackupToTelegram,
  maybeDailyBackup,
  zipEntriesToBuffer,
};
