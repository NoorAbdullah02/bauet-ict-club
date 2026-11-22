/**
 * Instant notifications for club admins via Telegram bot and/or Discord webhook.
 * Non-blocking, zero dependencies. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID,
 * or DISCORD_WEBHOOK_URL in environment. If neither is set, this no-ops silently.
 */

const baseSiteUrl = () => {
  const u = process.env.PUBLIC_URL || 'https://bauet-ict-club.onrender.com';
  return u.replace(/\/+$/, '');
};

async function sendTelegram({ title, description, fields = [], actionUrl, buttons = [] }) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return false;

  try {
    const formattedFields = fields
      .map(([k, v]) => {
        const isCode = /trx|id|code|transaction/i.test(k);
        const val = isCode ? `<code>${v}</code>` : v;
        return `• <b>${k}:</b> ${val}`;
      })
      .join('\n');

    const text = `<b>${title}</b>\n\n${description || ''}\n\n${formattedFields}`.trim();

    const inlineKeyboard = [];
    const actionRow = [];

    if (actionUrl) {
      actionRow.push({ text: '🔗 View in Admin', url: actionUrl });
    }

    buttons.forEach(([text, url]) => {
      if (url && (url.startsWith('http') || url.startsWith('mailto:') || url.startsWith('tel:'))) {
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

async function notifyAdmin({ title, description, fields = [], path, buttons = [] }) {
  const actionUrl = path ? `${baseSiteUrl()}${path.startsWith('/') ? '' : '/'}${path}` : `${baseSiteUrl()}/admin`;

  Promise.allSettled([
    sendTelegram({ title, description, fields, actionUrl, buttons }),
    sendDiscord({ title, description, fields, actionUrl }),
  ]).catch(() => {});
}

module.exports = {
  notifyAdmin,
};
