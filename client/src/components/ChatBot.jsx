import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import useStore from '../context/store';

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m the BAUET ICT Club AI assistant. Ask me anything about the club, events, or technology! 🤖' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const { chatWithAI } = useStore();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((p) => [...p, { role: 'user', content: userMsg }]);
    setLoading(true);
    try {
      const reply = await chatWithAI(userMsg, messages.slice(-10));
      setMessages((p) => [...p, { role: 'assistant', content: reply }]);
    } catch (e) {
      setMessages((p) => [...p, { role: 'assistant', content: 'Sorry, I\'m having trouble connecting. Please try again!' }]);
    }
    setLoading(false);
  };

  return (
    <>
      <motion.button
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 90,
          width: 56, height: 56, borderRadius: 16,
          background: 'linear-gradient(135deg, var(--accent), var(--tech))',
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 30px rgba(201,168,76,0.35)',
        }}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed', bottom: 92, right: 24, zIndex: 90,
              width: 380, maxWidth: 'calc(100vw - 48px)', height: 520, maxHeight: 'calc(100vh - 140px)',
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-xl)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
          >
            <div style={{
              padding: '18px 20px', background: 'linear-gradient(135deg, var(--navy), var(--navy-light, #162240))',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: 'rgba(201,168,76,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Bot size={20} color="#C9A84C" />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)' }}>ICT Club AI</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Powered by Groq</div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {messages.map((msg, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 8,
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  alignItems: 'flex-end',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: msg.role === 'user' ? 'var(--tech-light)' : 'var(--accent-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {msg.role === 'user' ? <User size={14} style={{ color: 'var(--tech)' }} /> : <Bot size={14} style={{ color: 'var(--accent)' }} />}
                  </div>
                  <div style={{
                    maxWidth: '75%', padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: msg.role === 'user' ? 'var(--tech)' : 'var(--bg-alt)',
                    color: msg.role === 'user' ? '#fff' : 'var(--fg)',
                    fontSize: 13, lineHeight: 1.6,
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Bot size={14} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div style={{ padding: '10px 14px', borderRadius: '14px 14px 14px 4px', background: 'var(--bg-alt)', fontSize: 13 }}>
                    <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}>
                      Thinking...
                    </motion.span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div style={{ padding: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Ask me anything..."
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-alt)', border: '1px solid var(--border)',
                  color: 'var(--fg)', fontSize: 13, outline: 'none',
                }}
              />
              <button onClick={send} disabled={loading || !input.trim()}
                style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-sm)',
                  background: 'var(--accent)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: loading || !input.trim() ? 0.5 : 1, transition: 'opacity 0.2s',
                }}>
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
