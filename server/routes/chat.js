const express = require('express');
const { fail } = require('../utils/http');
const Groq = require('groq-sdk');
require('dotenv').config({ path: '../.env' });

const rateLimit = require('express-rate-limit');

const router = express.Router();
const chatLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 40, standardHeaders: true, legacyHeaders: false, message: { error: 'You are chatting very fast. Please wait a few minutes.' } });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

const SYSTEM_PROMPT = `You are the AI assistant for BAUET ICT Club (Bangladesh Army University of Engineering & Technology, Rajshahi).
You help visitors learn about the club, events, technology, and university activities.

About the club:
- BAUET ICT Club is the premier technology club of BAUET
- Motto: "Dream. Create. Inspire."
- Activities: Workshops, Hackathons, Tech Talks, Competitive Programming, Projects
- Contact: ictclubbauet@gmail.com, Phone: 01707-533471
- Facebook: facebook.com/bauetictclub
- Membership: visitors can apply from the "Join Our Club" section of the website, either as a Committee Member (choose a post, photo required) a General Member (pick interests), or a Department Ambassador (photo required, represents their department). Applications are reviewed by the team.
- Location: BAUET, Qadirabad Cantonment, Natore, Rajshahi

Be friendly, helpful, and concise. Answer in English or Bengali/Bangla based on the user's language.
If you don't know something specific about the club, say so honestly and suggest contacting the club directly.`;

router.post('/', chatLimiter, async (req, res) => {
  const { message } = req.body || {};
  const history = Array.isArray(req.body?.history) ? req.body.history : [];
  if (!message || typeof message !== 'string') return res.status(400).json({ error: 'Message required' });

  if (!process.env.GROQ_API_KEY) {
    return res.json({
      reply: 'AI chatbot is being set up! Please configure your GROQ_API_KEY in the .env file. In the meantime, feel free to reach out to us at ictclubbauet@gmail.com or visit our Facebook page!',
    });
  }

  try {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.slice(-8)
        .filter((m) => ['user', 'assistant'].includes(m?.role) && typeof m.content === 'string')
        .map((m) => ({ role: m.role, content: m.content.slice(0, 1500) })),
      { role: 'user', content: String(message).slice(0, 1500) },
    ];

    const completion = await groq.chat.completions.create({
      messages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 500,
    });

    res.json({ reply: completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.' });
  } catch (e) {
    fail(res, e);
  }
});

module.exports = router;
