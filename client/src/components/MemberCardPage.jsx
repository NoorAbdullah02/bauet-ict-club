import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BadgeCheck, Loader2, Printer, Link2, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../context/store';
import { qrDataUrl } from '../lib/qr';
import { thumb } from '../lib/img';
import { copyText } from '../lib/share';
import Logo from './Logo';

const initials = (n = '') => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

/** A member's digital card: photo, name, post, committee, and a QR code that proves the card is genuine. */
export default function MemberCardPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const c = params.get('c') || '';
  const [data, setData] = useState(null); // null = loading, false = not found
  const [qr, setQr] = useState('');

  useEffect(() => {
    api.get(`/card/${id}`, { params: c ? { c } : {} }).then((r) => setData(r.data)).catch(() => setData(false));
    const meta = Object.assign(document.createElement('meta'), { name: 'robots', content: 'noindex' });
    document.head.appendChild(meta);
    return () => meta.remove();
  }, [id, c]);
  useEffect(() => {
    if (data) { document.title = `${data.member.name} | BAUET ICT Club`; qrDataUrl(`${window.location.origin}/card/${data.member.id}?c=${data.code}`, 360).then(setQr).catch(() => {}); }
  }, [data]);

  if (data === null) return <section className="section"><div className="container grid min-h-[50vh] place-items-center"><Loader2 className="animate-spin text-muted" /></div></section>;
  if (data === false) return <section className="section"><div className="container grid min-h-[40vh] place-items-center text-center"><div><h1 className="text-3xl text-fg">Member not found</h1><p className="mt-2 text-fg2">This card does not exist.</p><Link to="/team" className="btn-primary mt-6 inline-flex">See the team</Link></div></div></section>;

  const m = data.member;
  const checked = !!c; // somebody scanned a code: tell them whether it is real
  return (
    <section className="section">
      <div className="container max-w-md">
        {checked && (
          <div className={`mb-4 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${data.verified ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'}`}>
            {data.verified ? <><BadgeCheck size={18} /> Genuine card: this person is a member of BAUET ICT Club.</> : <><ShieldAlert size={18} /> This code does not match the card. Do not trust it.</>}
          </div>
        )}
        <motion.div initial={{ opacity: 0, y: 24, rotateX: 8 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-[28px] text-white shadow-[0_30px_70px_rgba(10,26,74,0.45)]" style={{ background: 'linear-gradient(140deg,#071a52 0%,#1F4FD8 55%,#17A2D8 120%)' }}>
          <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-[#35D989]/30 blur-[70px]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/20 to-transparent" />
          <div className="relative flex items-center justify-between px-6 pt-5"><span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/75">BAUET ICT Club · Member</span><span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold">{m.current ? 'Active' : 'Former'}</span></div>
          <div className="relative flex items-center gap-4 px-6 py-5">
            <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white/15 text-3xl font-bold ring-2 ring-white/40">
              {m.image_url ? <img src={thumb(m.image_url, 300)} alt={m.name} className="size-full object-cover" /> : initials(m.name)}
            </div>
            <div className="min-w-0"><h1 className="text-[1.6rem] font-bold leading-tight text-white">{m.name}</h1><p className="mt-1 text-sm text-white/85">{m.position}</p><p className="mt-0.5 text-xs text-white/70">{[m.department, m.batch && `${m.batch} Batch`].filter(Boolean).join(' · ')}</p></div>
          </div>
          <div className="relative mx-6 border-t border-dashed border-white/30" />
          <div className="relative flex items-center justify-between gap-4 px-6 py-5">
            <div><p className="font-mono text-[10px] uppercase tracking-widest text-white/60">Committee</p><p className="text-lg font-semibold">{m.session || 'BAUET ICT Club'}</p><p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-white/60">Card code</p><p className="font-mono text-sm tracking-widest">{data.code}</p></div>
            <div className="grid size-28 shrink-0 place-items-center rounded-2xl bg-white p-1.5">{qr ? <img src={qr} alt="QR code of this card" className="size-full" /> : <Loader2 className="animate-spin text-slate-400" />}</div>
          </div>
          <div className="relative flex items-center justify-between bg-black/15 px-6 py-3"><Logo kind="club" height={26} className="brightness-0 invert" /><span className="text-[11px] text-white/70">Scan to check this card</span></div>
        </motion.div>
        <div className="mt-5 flex flex-wrap justify-center gap-2 print:hidden">
          <button onClick={() => window.print()} className="btn-outline !px-4 !py-2.5 text-xs"><Printer size={14} /> Print</button>
          <button onClick={async () => { const ok = await copyText(`${window.location.origin}/card/${m.id}?c=${data.code}`); toast[ok ? 'success' : 'error'](ok ? 'Card link copied' : 'Could not copy'); }} className="btn-outline !px-4 !py-2.5 text-xs"><Link2 size={14} /> Copy link</button>
        </div>
      </div>
    </section>
  );
}
