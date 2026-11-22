const express = require('express');
const pool = require('../config/db');
const { sendBackupToTelegram } = require('../utils/backupTelegram');

const router = express.Router();

const baseSiteUrl = () => {
  const u = process.env.PUBLIC_URL || 'https://bauet-ict-club.onrender.com';
  return u.replace(/\/+$/, '');
};

async function replyTelegram(chatId, text, inlineKeyboard = null) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return false;
  try {
    const payload = {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    };
    if (inlineKeyboard?.length) {
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
    console.warn('replyTelegram failed:', err.message);
    return false;
  }
}

async function answerCallbackQuery(callbackQueryId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return false;
  try {
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
      signal: AbortSignal.timeout(4000),
    });
  } catch {}
}

router.post('/webhook', async (req, res) => {
  res.status(200).json({ ok: true }); // Telegram expects quick 200 OK

  const update = req.body || {};
  const authorizedChatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!authorizedChatId) return;

  // Handle Button Callback Queries (e.g. approve)
  if (update.callback_query) {
    const cb = update.callback_query;
    const fromChatId = String(cb.message?.chat?.id || '');
    if (authorizedChatId && fromChatId !== authorizedChatId) return;

    const data = String(cb.data || '');
    if (data.startsWith('appr:')) {
      const regId = Number(data.split(':')[1]);
      if (regId) {
        try {
          const { rows } = await pool.query(
            "UPDATE registrations SET status = 'approved', updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *",
            [regId]
          );
          if (rows.length) {
            const reg = rows[0];
            try {
              const mail = require('../utils/mail');
              const { cardCode } = require('./card');
              const key = `r${reg.id}`;
              mail.sendMail({ to: reg.email, ...mail.templates.applicationApproved({ ...reg, card_path: `/card/${key}?c=${cardCode(key)}` }) });
            } catch (mErr) {
              console.warn('Telegram approve email delivery failed:', mErr.message);
            }
            await answerCallbackQuery(cb.id, `Approved ${reg.full_name}!`);
            await replyTelegram(
              fromChatId,
              `✅ <b>Application Approved</b>\n• <b>Name:</b> ${reg.full_name}\n• <b>Student ID:</b> <code>${reg.student_id}</code>\n• <b>Type:</b> ${reg.type}\n• <b>Email sent:</b> ${reg.email}`
            );
          } else {
            await answerCallbackQuery(cb.id, 'Application not found or already deleted.');
          }
        } catch (err) {
          await answerCallbackQuery(cb.id, 'Database update failed.');
        }
      }
    }
    return;
  }

  // Handle Text Messages
  const msg = update.message;
  if (!msg || !msg.text) return;

  const chatId = String(msg.chat.id);
  if (authorizedChatId && chatId !== authorizedChatId) {
    return; // Ignore unauthorized chats
  }

  const rawText = msg.text.trim();
  const command = rawText.split(/\s+/)[0].toLowerCase();
  const query = rawText.slice(command.length).trim();

  // /start or /help
  if (command === '/start' || command === '/help' || command.startsWith('/help@')) {
    const helpMsg = `🤖 <b>BAUET ICT Club Admin Bot</b>

<b>Available commands:</b>
📊 <b>/stats</b> — Live statistics on members, events, & views
⏳ <b>/pending</b> — Review pending membership applications
🔍 <b>/find</b> <i>&lt;id or name&gt;</i> — Search member card or application
📅 <b>/events</b> — Upcoming club events summary
💾 <b>/backup</b> — Instant database backup sent to this chat
❓ <b>/help</b> — Show this command guide`;
    await replyTelegram(chatId, helpMsg);
    return;
  }

  // /stats
  if (command === '/stats' || command.startsWith('/stats@')) {
    try {
      const [membersCount, pendingCount, eventsCount, signupsCount, todayViews] = await Promise.all([
        pool.query("SELECT COUNT(*) AS c FROM members WHERE deleted_at IS NULL"),
        pool.query("SELECT COUNT(*) AS c FROM registrations WHERE status = 'pending' AND deleted_at IS NULL"),
        pool.query("SELECT COUNT(*) AS c FROM events WHERE deleted_at IS NULL AND date >= CURRENT_DATE"),
        pool.query("SELECT COUNT(*) AS c FROM event_registrations WHERE deleted_at IS NULL"),
        pool.query("SELECT COUNT(*) AS c FROM page_views WHERE created_at >= CURRENT_DATE"),
      ]);

      const statsMsg = `📊 <b>BAUET ICT Club — Live Pulse</b>

👥 <b>Active Members:</b> ${membersCount.rows[0]?.c || 0}
⏳ <b>Pending Applications:</b> ${pendingCount.rows[0]?.c || 0}
📅 <b>Upcoming Events:</b> ${eventsCount.rows[0]?.c || 0}
🎟️ <b>Total Event Sign-ups:</b> ${signupsCount.rows[0]?.c || 0}
🌐 <b>Today's Web Visitors:</b> ${todayViews.rows[0]?.c || 0}`;

      const buttons = [[{ text: '🔗 Open Admin Console', url: `${baseSiteUrl()}/admin` }]];
      await replyTelegram(chatId, statsMsg, buttons);
    } catch (err) {
      await replyTelegram(chatId, `⚠️ Could not query stats: ${err.message}`);
    }
    return;
  }

  // /pending
  if (command === '/pending' || command.startsWith('/pending@')) {
    try {
      const { rows } = await pool.query(
        "SELECT id, full_name, student_id, type, post, department FROM registrations WHERE status = 'pending' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 6"
      );

      if (!rows.length) {
        await replyTelegram(chatId, '✅ <b>All caught up!</b> No pending applications right now.');
        return;
      }

      await replyTelegram(chatId, `⏳ <b>Pending Applications (${rows.length} showing):</b>`);

      for (const r of rows) {
        const itemMsg = `• <b>${r.full_name}</b> (<code>${r.student_id}</code>)\n  Role: ${r.type}${r.post ? ` · ${r.post}` : ''} | Dept: ${r.department}`;
        const inlineKeyboard = [
          [
            { text: '✅ Approve', callback_data: `appr:${r.id}` },
            { text: '🔗 View in Admin', url: `${baseSiteUrl()}/admin/applications` },
          ],
        ];
        await replyTelegram(chatId, itemMsg, inlineKeyboard);
      }
    } catch (err) {
      await replyTelegram(chatId, `⚠️ Could not fetch pending applications: ${err.message}`);
    }
    return;
  }

  // /find <term>
  if (command === '/find' || command.startsWith('/find@')) {
    if (!query) {
      await replyTelegram(chatId, 'Usage: <code>/find 21020123</code> or <code>/find Tanvir</code>');
      return;
    }

    try {
      const p = `%${query.toLowerCase()}%`;
      const [members, regs, tickets] = await Promise.all([
        pool.query(
          "SELECT id, name, position, student_id, department FROM members WHERE deleted_at IS NULL AND (LOWER(name) LIKE $1 OR LOWER(COALESCE(student_id, '')) LIKE $1) LIMIT 3",
          [p]
        ),
        pool.query(
          "SELECT id, full_name, student_id, type, status, post FROM registrations WHERE deleted_at IS NULL AND (LOWER(full_name) LIKE $1 OR LOWER(COALESCE(student_id, '')) LIKE $1) LIMIT 3",
          [p]
        ),
        pool.query(
          "SELECT id, full_name, student_id, ticket, pay_status FROM event_registrations WHERE deleted_at IS NULL AND (LOWER(full_name) LIKE $1 OR LOWER(COALESCE(student_id, '')) LIKE $1 OR LOWER(COALESCE(ticket, '')) LIKE $1) LIMIT 3",
          [p]
        ),
      ]);

      if (!members.rows.length && !regs.rows.length && !tickets.rows.length) {
        await replyTelegram(chatId, `🔍 No records found for "<b>${query}</b>".`);
        return;
      }

      let resText = `🔍 <b>Search results for "${query}":</b>\n`;

      if (members.rows.length) {
        resText += `\n<b>Club Members:</b>\n`;
        members.rows.forEach((m) => {
          resText += `• ${m.name} (${m.position}) · <code>${m.student_id || '-'}</code>\n  Card: ${baseSiteUrl()}/card/${m.id}\n`;
        });
      }

      if (regs.rows.length) {
        resText += `\n<b>Applications:</b>\n`;
        regs.rows.forEach((r) => {
          resText += `• ${r.full_name} · <code>${r.student_id}</code> [${r.status.toUpperCase()}]\n  Type: ${r.type}${r.post ? ` (${r.post})` : ''}\n`;
        });
      }

      if (tickets.rows.length) {
        resText += `\n<b>Event Tickets:</b>\n`;
        tickets.rows.forEach((t) => {
          resText += `• ${t.full_name} · Ticket: <code>${t.ticket}</code> [Pay: ${t.pay_status}]\n`;
        });
      }

      await replyTelegram(chatId, resText);
    } catch (err) {
      await replyTelegram(chatId, `⚠️ Search failed: ${err.message}`);
    }
    return;
  }

  // /events
  if (command === '/events' || command.startsWith('/events@')) {
    try {
      const { rows } = await pool.query(
        "SELECT id, title, date, location FROM events WHERE deleted_at IS NULL AND date >= CURRENT_DATE ORDER BY date ASC LIMIT 5"
      );

      if (!rows.length) {
        await replyTelegram(chatId, '📅 No upcoming events scheduled right now.');
        return;
      }

      let evText = `📅 <b>Upcoming Club Events:</b>\n\n`;
      rows.forEach((e) => {
        const d = new Date(e.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        evText += `• <b>${e.title}</b>\n  Date: ${d} ${e.location ? `· ${e.location}` : ''}\n  Link: ${baseSiteUrl()}/events/${e.id}\n\n`;
      });

      await replyTelegram(chatId, evText.trim());
    } catch (err) {
      await replyTelegram(chatId, `⚠️ Could not fetch events: ${err.message}`);
    }
    return;
  }

  // /backup
  if (command === '/backup' || command.startsWith('/backup@')) {
    await replyTelegram(chatId, '⏳ Generating fresh database backup, please wait a moment...');
    const result = await sendBackupToTelegram({
      caption: `📦 <b>Manual Database Backup</b>\nRequested via Telegram by @${msg.from?.username || msg.from?.first_name || 'Admin'}`,
    });
    if (!result.ok) {
      await replyTelegram(chatId, `❌ Backup failed: ${result.error}`);
    }
  }
});

module.exports = router;
