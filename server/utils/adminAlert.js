/**
 * Instant notifications for club admins via Telegram bot and/or Discord webhook.
 * Non-blocking, zero dependencies. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID,
 * or DISCORD_WEBHOOK_URL in environment. If neither is set, this no-ops silently.
 */

const baseSiteUrl = () => {
  const u = process.env.PUBLIC_URL || 'https://bauet-ict-club.onrender.com';
  return u.replace(/\/+$/, '');
};

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function sendTelegram({ title, description, fields = [], actionUrl, buttons = [], callbackButtons = [] }) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return false;

  try {
    const formattedFields = fields
      .filter(([k, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => {
        const key = esc(k);
        const isCode = /trx|id|code|transaction/i.test(k);
        const isPhone = /phone|contact/i.test(k) && /^\+?[\d\s-]{7,}$/.test(String(v).trim());
        const isEmail = /email/i.test(k) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());
        const cleanVal = esc(v);

        let val;
        if (isCode) {
          val = `<code>${cleanVal}</code>`;
        } else if (isEmail) {
          val = `<a href="mailto:${cleanVal}">${cleanVal}</a>`;
        } else if (isPhone) {
          val = `<a href="tel:${String(v).replace(/\s+/g, '')}">${cleanVal}</a>`;
        } else {
          val = cleanVal;
        }
        return `• <b>${key}:</b> ${val}`;
      })
      .join('\n');

    const text = `<b>${title}</b>\n\n${description || ''}\n\n${formattedFields}`.trim();

    const inlineKeyboard = [];

    // Optional Instant Action row (e.g. Approve)
    if (callbackButtons?.length) {
      inlineKeyboard.push(callbackButtons.map((b) => ({ text: b.text, callback_data: b.callback_data })));
    }

    const actionRow = [];
    if (actionUrl) {
      actionRow.push({ text: '🔗 View in Admin', url: actionUrl });
    }

    buttons.forEach(([text, url]) => {
      if (url && (url.startsWith('https://') || url.startsWith('http://') || url.startsWith('tg://'))) {
        actionRow.push({ text, url });
      }
    });

    if (actionRow.length) {
      inlineKeyboard.push(actionRow);
    }

    const payload = {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    };

    if (inlineKeyboard.length) {
      payload.reply_markup = { inline_keyboard: inlineKeyboard };
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`Telegram alert HTTP ${res.status}:`, errText);
    }
    return res.ok;
  } catch (err) {
    console.warn('Telegram alert skipped:', err.message);
    return false;
  }
}

async function sendDiscord({ title, description, fields = [], actionUrl }) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL?.trim();
  if (!webhookUrl) return false;

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [
          {
            title: title || 'BAUET ICT Club Alert',
            url: actionUrl,
            description,
            color: 0x00e5ff,
            fields: fields.map(([name, value]) => ({ name, value: String(value || '-'), inline: true })),
            footer: { text: 'BAUET ICT Club Automation' },
            timestamp: new Date().toISOString(),
          },
        ],
      }),
      signal: AbortSignal.timeout(6000),
    });
    return res.ok;
  } catch (err) {
    console.warn('Discord alert skipped:', err.message);
    return false;
  }
}

async function notifyAdmin({ title, description, fields = [], path, buttons = [], callbackButtons = [] }) {
  const actionUrl = path ? `${baseSiteUrl()}${path.startsWith('/') ? '' : '/'}${path}` : `${baseSiteUrl()}/admin`;

  Promise.allSettled([
    sendTelegram({ title, description, fields, actionUrl, buttons, callbackButtons }),
    sendDiscord({ title, description, fields, actionUrl }),
  ]).catch(() => {});
}

module.exports = {
  notifyAdmin,
  esc,
};
