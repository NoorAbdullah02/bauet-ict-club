import { useState, useRef, useEffect, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatMark from './ChatMark';
import { X, ArrowUp, RotateCcw, Crown, Users, CalendarDays, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../context/store';
import { cn } from '../lib/cn';

const STORE_KEY = 'bauet-chat';
const GREETING = { role: 'assistant', content: 'Hi! I’m the **ICT Club assistant**.\nAsk me about events, joining the club, the committee — in English or বাংলা.' };

const SUGGESTIONS = [
  { icon: Crown, label: 'Join the committee', text: 'How can I apply for the committee?' },
  { icon: Users, label: 'Become a member', text: 'How do I become a general member?' },
  { icon: CalendarDays, label: 'Upcoming events', text: 'What events are coming up?' },
  { icon: Mail, label: 'Contact the club', text: 'How can I contact the club?' },
];

const load = () => {
  try { const v = JSON.parse(sessionStorage.getItem(STORE_KEY)); if (Array.isArray(v) && v.length) return v; } catch { /* ignore */ }
  return [GREETING];
};

// tiny safe renderer: **bold**, line breaks, bare links — no innerHTML
function Rich({ text }) {
  return text.split('\n').map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {line.split(/(\*\*[^*]+\*\*|https?:\/\/[^\s)]+)/g).map((part, j) => {
        if (/^\*\*.+\*\*$/.test(part)) return <strong key={j}>{part.slice(2, -2)}</strong>;
        if (/^https?:\/\//.test(part)) return <a key={j} href={part} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-2">{part}</a>;
        return part;
      })}
    </Fragment>
  ));
}

function Orb({ size = 40, pulse }) {
  return (
    <span className="relative grid shrink-0 place-items-center rounded-full text-white" style={{ width: size, height: size, background: 'var(--grad-btn)' }}>
      {pulse && <span className="absolute inset-0 animate-ping rounded-full bg-accent/40" />}
      <ChatMark size={size * 0.6} className="relative" />
    </span>
  );
}

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(load);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const { chatWithAI } = useStore(useShallow((s) => ({ chatWithAI: s.chatWithAI })));

  useEffect(() => { try { sessionStorage.setItem(STORE_KEY, JSON.stringify(messages.slice(-30))); } catch { /* ignore */ } }, [messages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, loading, open]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 350); }, [open]);
  useEffect(() => {
    const t = setTimeout(() => !open && setTeaser(true), 6000);
    const h = setTimeout(() => setTeaser(false), 14000);
    return () => { clearTimeout(t); clearTimeout(h); };
  }, []);

  const navigate = useNavigate();
  const go = (path) => { setOpen(false); navigate(path); };

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    const next = [...messages, { role: 'user', content: msg }];
    setMessages(next);
    setLoading(true);
    try {
      const reply = await chatWithAI(msg, next.slice(-10, -1));
      setMessages((p) => [...p, { role: 'assistant', content: reply }]);
    } catch {
      setMessages((p) => [...p, { role: 'assistant', content: 'I couldn’t reach the server just now. Please try again, or email **ictclubbauet@gmail.com**.' }]);
    }
    setLoading(false);
  };

  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };
  const grow = (e) => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 110) + 'px'; };
  const fresh = messages.length <= 1;

  return (
    <>
      <div className="fixed bottom-6 right-6 z-[90] flex flex-col items-end gap-3 max-sm:bottom-4 max-sm:right-4">
        <AnimatePresence>
          {teaser && !open && (
            <motion.button initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => { setOpen(true); setTeaser(false); }}
              className="rounded-2xl rounded-br-sm border border-line bg-surface px-4 py-2.5 text-left text-xs text-fg shadow-[var(--shadow-lg)]">
              <span className="font-semibold">Need help?</span> <span className="text-fg2">Ask about joining</span>
            </motion.button>
          )}
        </AnimatePresence>
        <motion.button onClick={() => setOpen((o) => !o)} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} aria-label={open ? 'Close chat' : 'Open chat'}
          className="relative grid size-14 place-items-center rounded-full text-white shadow-[0_10px_40px_rgba(var(--accent-rgb),0.55)]" style={{ background: 'var(--grad-btn)' }}>
          {!open && <span className="absolute inset-0 animate-ping rounded-full bg-accent/30" style={{ animationDuration: '2.8s' }} />}
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={open ? 'x' : 's'} initial={{ rotate: -80, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 80, opacity: 0 }} transition={{ duration: 0.2 }} className="relative">
              {open ? <X size={22} /> : <ChatMark size={28} />}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.section role="dialog" aria-label="ICT Club assistant"
            initial={{ opacity: 0, y: 28, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }} style={{ transformOrigin: 'bottom right' }}
            className="fixed bottom-24 right-6 z-[90] flex h-[34rem] max-h-[calc(100vh-8rem)] w-[24rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[28px] border border-line bg-[var(--glass)] shadow-[var(--shadow-xl)] backdrop-blur-2xl max-sm:bottom-20 max-sm:right-4">
            <div className="pointer-events-none absolute -top-24 left-1/2 size-64 -translate-x-1/2 rounded-full bg-accent/30 blur-3xl" />

            <header className="relative flex items-center gap-3 border-b border-line px-5 py-4">
              <Orb pulse />
              <div className="min-w-0 flex-1">
                <div className="font-display text-base font-semibold leading-tight text-fg">ICT Club Assistant</div>
                <div className="flex items-center gap-1.5 text-[11px] text-fg2"><span className="size-1.5 rounded-full bg-emerald-400" /> Online · replies in English & বাংলা</div>
              </div>
              <button onClick={() => setMessages([GREETING])} title="New chat" aria-label="New chat"
                className="grid size-8 place-items-center rounded-full text-fg2 transition hover:bg-accent/10 hover:text-accent"><RotateCcw size={15} /></button>
              <button onClick={() => setOpen(false)} aria-label="Close" className="grid size-8 place-items-center rounded-full text-fg2 transition hover:bg-accent/10 hover:text-accent"><X size={16} /></button>
            </header>

            <div className="relative flex-1 space-y-4 overflow-y-auto px-4 py-5">
              {messages.map((m, i) => {
                const user = m.role === 'user';
                return (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className={cn('flex gap-2.5', user && 'flex-row-reverse')}>
                    {!user && <Orb size={28} />}
                    <div className={cn('max-w-[80%] px-4 py-2.5 text-[13.5px] leading-6',
                      user ? 'rounded-2xl rounded-br-md text-white shadow-lg' : 'rounded-2xl rounded-bl-md border border-line bg-surface/80 text-fg')}
                      style={user ? { background: 'var(--grad-btn)', color: 'var(--btn-fg)' } : undefined}>
                      <Rich text={m.content} />
                    </div>
                  </motion.div>
                );
              })}

              {loading && (
                <div className="flex items-end gap-2.5">
                  <Orb size={28} />
                  <div className="flex gap-1 rounded-2xl rounded-bl-md border border-line bg-surface/80 px-4 py-3.5">
                    {[0, 1, 2].map((d) => (
                      <motion.span key={d} className="size-1.5 rounded-full bg-accent" animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.9, repeat: Infinity, delay: d * 0.15 }} />
                    ))}
                  </div>
                </div>
              )}

              {fresh && !loading && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {SUGGESTIONS.map((s, i) => (
                    <motion.button key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.07 }}
                      onClick={() => send(s.text)}
                      className="group flex flex-col gap-2 rounded-2xl border border-line bg-surface/60 p-3 text-left transition hover:-translate-y-0.5 hover:border-accent/60 hover:bg-accent/5">
                      <s.icon size={16} className="text-accent" />
                      <span className="text-xs font-medium text-fg">{s.label}</span>
                    </motion.button>
                  ))}
                </div>
              )}

              {!fresh && !loading && messages[messages.length - 1]?.role === 'assistant' && /join|apply|member|committee|কমিটি|সদস্য/i.test(messages[messages.length - 1].content) && (
                <div className="flex flex-wrap gap-2 pl-9">
                  <button onClick={() => go('/join/committee')} className="flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20"><Crown size={12} /> Committee form</button>
                  <button onClick={() => go('/join/general')} className="flex items-center gap-1.5 rounded-full border border-tech/40 bg-tech/10 px-3 py-1.5 text-xs font-medium text-tech hover:bg-tech/20"><Users size={12} /> Member form</button>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="relative border-t border-line p-3">
              <div className="flex items-end gap-2 rounded-3xl border border-line bg-bg/60 p-1.5 pl-4 transition focus-within:border-tech focus-within:ring-4 focus-within:ring-tech/15">
                <textarea ref={inputRef} rows={1} value={input} onChange={grow} onKeyDown={onKey} maxLength={500} placeholder="Ask the ICT Club…"
                  className="max-h-28 min-h-9 flex-1 resize-none bg-transparent py-2 text-sm text-fg outline-none placeholder:text-muted" />
                <button type="submit" disabled={loading || !input.trim()} aria-label="Send"
                  className="grid size-9 shrink-0 place-items-center rounded-full text-white transition disabled:opacity-40" style={{ background: 'var(--grad-btn)' }}>
                  <ArrowUp size={17} />
                </button>
              </div>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
