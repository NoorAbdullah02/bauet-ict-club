import { useState } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Mail, Phone, MapPin, Globe, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../context/store';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] } }),
};

export default function Contact() {
  const { settings, sendMessage } = useStore(useShallow((s) => ({ settings: s.settings, sendMessage: s.sendMessage })));
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [ref, inView] = useInView({ threshold: 0.05, triggerOnce: true });

  const s = settings?.socialLinks || {};

  const contacts = [
    { icon: Mail, label: 'Email', value: s.email || 'ictclubbauet@gmail.com', href: `mailto:${s.email || 'ictclubbauet@gmail.com'}` },
    { icon: Phone, label: 'Phone', value: s.phone || '01707-533471', href: `tel:${s.phone || '01707-533471'}` },
    { icon: MapPin, label: 'Location', value: 'BAUET, Qadirabad Cantonment, Natore, Rajshahi' },
    { icon: Globe, label: 'Website', value: s.website || 'bauet.ac.bd', href: `https://${s.website || 'bauet.ac.bd'}` },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill all required fields');
      return;
    }
    setSending(true);
    try {
      await sendMessage(form);
      toast.success('Message sent successfully!');
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      toast.error('Failed to send. Please email us directly.');
    }
    setSending(false);
  };

  const inputStyle = {
    padding: '14px 18px', borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-alt)', border: '1px solid var(--border)',
    color: 'var(--fg)', fontSize: 14, fontFamily: 'var(--font-body)',
    transition: 'border-color 0.2s', outline: 'none', width: '100%',
  };

  return (
    <section id="contact" className="section" ref={ref}>
      <div className="container">
        <motion.div className="section-header" initial="hidden" animate={inView ? 'visible' : 'hidden'} variants={fadeUp} custom={0}>
          <div className="section-tag">Get In Touch</div>
          <h2 className="section-title">Contact Us</h2>
          <p className="section-desc">Have a question or want to collaborate?</p>
          <div className="divider" />
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20, marginBottom: 56 }}>
          {contacts.map((c, i) => (
            <motion.div
              key={c.label}
              custom={i + 1}
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
              variants={fadeUp}
              whileHover={{ y: -4, borderColor: 'var(--accent)' }}
              style={{
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', padding: 24,
                display: 'flex', gap: 16, alignItems: 'flex-start', transition: 'all 0.3s',
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                background: 'var(--accent-light)', color: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <c.icon size={20} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4, fontWeight: 600 }}>{c.label}</div>
                {c.href ? (
                  <a href={c.href} style={{ fontSize: 15, fontWeight: 500, wordBreak: 'break-all' }}>{c.value}</a>
                ) : (
                  <span style={{ fontSize: 15, fontWeight: 500 }}>{c.value}</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.form
          initial="hidden" animate={inView ? 'visible' : 'hidden'} variants={fadeUp} custom={5}
          onSubmit={handleSubmit}
          style={{ maxWidth: 620, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-secondary)', display: 'block', marginBottom: 6 }}>Name *</label>
              <input name="name" aria-label="Your name" autoComplete="name" style={inputStyle} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'} onBlur={(e) => e.target.style.borderColor = 'var(--border)'} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-secondary)', display: 'block', marginBottom: 6 }}>Email *</label>
              <input name="email" aria-label="Your email" autoComplete="email" style={inputStyle} type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'} onBlur={(e) => e.target.style.borderColor = 'var(--border)'} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-secondary)', display: 'block', marginBottom: 6 }}>Subject</label>
            <input name="subject" aria-label="Subject" autoComplete="off" style={inputStyle} value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'} onBlur={(e) => e.target.style.borderColor = 'var(--border)'} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-secondary)', display: 'block', marginBottom: 6 }}>Message *</label>
            <textarea aria-label="Your message" style={{ ...inputStyle, resize: 'vertical', minHeight: 120 }} value={form.message}
              onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} required
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'} onBlur={(e) => e.target.style.borderColor = 'var(--border)'} />
          </div>
          <button type="submit" className="btn-primary" disabled={sending} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Send size={16} /> {sending ? 'Sending...' : 'Send Message'}
          </button>
        </motion.form>
      </div>
    </section>
  );
}
