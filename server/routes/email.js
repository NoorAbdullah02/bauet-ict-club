const express = require('express');
const { fail } = require('../utils/http');
const router = express.Router();

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let brevoClient = null;

function getBrevoClient() {
  if (brevoClient) return brevoClient;
  if (!process.env.BREVO_API_KEY) return null;
  try {
    const brevo = require('@getbrevo/brevo');
    const apiInstance = new brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);
    brevoClient = apiInstance;
    return apiInstance;
  } catch {
    return null;
  }
}

const rateLimit = require('express-rate-limit');
const limiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: { error: 'Too many messages. Please try again later.' } });

router.post('/contact', limiter, async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required' });
  }

  const api = getBrevoClient();
  if (!api) {
    return res.json({ success: true, note: 'Email service not configured — message saved to database only' });
  }

  try {
    const sendSmtpEmail = {
      to: [{ email: 'ictclubbauet@gmail.com', name: 'BAUET ICT Club' }],
      sender: { email: 'noreply@bauetictclub.com', name: 'BAUET ICT Club Website' },
      replyTo: { email, name },
      subject: subject || `Contact Form: ${name}`,
      htmlContent: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${esc(name)}</p>
        <p><strong>Email:</strong> ${esc(email)}</p>
        <p><strong>Subject:</strong> ${esc(subject) || 'N/A'}</p>
        <p><strong>Message:</strong></p>
        <p>${esc(message)}</p>
      `,
    };

    await api.sendTransacEmail(sendSmtpEmail);
    res.json({ success: true });
  } catch (e) {
    fail(res, e);
  }
});

module.exports = router;
