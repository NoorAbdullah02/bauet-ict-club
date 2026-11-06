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
        <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-[30px] text-white shadow-[0_34px_80px_rgba(10,26,74,0.5)] ring-1 ring-white/25"
          style={{ background: 'radial-gradient(120% 80% at 0% 0%, #2B63FF 0%, rgba(43,99,255,0) 55%), radial-gradient(90% 70% at 100% 100%, #11B5A4 0%, rgba(17,181,164,0) 60%), linear-gradient(150deg,#06113A 0%,#0B2A78 55%,#0A4D8F 100%)' }}>
          {/* fine grid that fades out, and a soft diagonal gloss */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)', backgroundSize: '26px 26px', WebkitMaskImage: 'linear-gradient(180deg,#000,transparent 80%)', maskImage: 'linear-gradient(180deg,#000,transparent 80%)' }} />
          <div aria-hidden="true" className="pointer-events-none absolute -left-1/4 -top-1/3 h-[130%] w-1/2 rotate-[18deg] bg-gradient-to-r from-transparent via-white/[0.14] to-transparent" />

          <div className="relative flex items-center justify-between px-6 pt-5">
            <span className="rounded-2xl bg-white px-3 py-1.5 shadow-md"><Logo kind="club" height={24} /></span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold backdrop-blur"><i className={`size-2 rounded-full ${m.current ? 'bg-[#35D989] shadow-[0_0_8px_#35D989]' : 'bg-white/50'}`} /> {m.current ? 'Active member' : 'Former member'}</span>
          </div>

          <div className="relative flex items-center gap-4 px-6 pb-5 pt-6">
            <div className="shrink-0 rounded-[26px] p-[3px]" style={{ background: 'linear-gradient(135deg,#35D989,#38C8F0,#8B5CF6)' }}>
              <div className="grid size-24 place-items-center overflow-hidden rounded-[23px] bg-[#0B2A78] text-3xl font-bold">
                {m.image_url ? <img src={thumb(m.image_url, 300)} alt={m.name} className="size-full object-cover" /> : initials(m.name)}
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="break-words text-[1.55rem] font-bold leading-[1.1] tracking-tight text-white">{m.name}</h1>
              <span className="mt-2 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">{m.position}</span>
            </div>
          </div>

          <div className="relative mx-6 grid grid-cols-3 gap-2 rounded-2xl border border-white/15 bg-white/[0.07] p-3 text-center backdrop-blur">
            {[['Department', m.department || '-'], ['Batch', m.batch || '-'], [/^Member since/.test(m.session || '') ? 'Joined' : 'Committee', (m.session || 'BAUET ICT Club').replace(/^Member since /, '')]].map(([k, v]) => (
              <div key={k} className="min-w-0"><div className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/55">{k}</div><div className="mt-0.5 truncate text-[13px] font-semibold">{v}</div></div>
            ))}
          </div>

          <div className="relative flex items-end justify-between gap-4 px-6 pb-6 pt-5">
            <div className="min-w-0">
              <span aria-hidden="true" className="mb-3 block h-7 w-10 rounded-md bg-gradient-to-br from-[#F7DC8A] via-[#E2B64E] to-[#B98A2B] shadow-inner" />
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/55">Card code</p>
              <p className="mt-0.5 font-mono text-[15px] tracking-[0.18em]">{data.code}</p>
              <p className="mt-2 text-[11px] text-white/60">Scan the QR code to check this card</p>
            </div>
            <div className="grid size-[7.5rem] shrink-0 place-items-center rounded-2xl bg-white p-2 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">{qr ? <img src={qr} alt="QR code of this card" className="size-full" /> : <Loader2 className="animate-spin text-slate-400" />}</div>
          </div>
          <div aria-hidden="true" className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg,#35D989,#38C8F0,#8B5CF6,#FF6B8A,#FFD166)' }} />
        </motion.div>
        <div className="mt-5 flex flex-wrap justify-center gap-2 print:hidden">
          <button onClick={() => window.print()} className="btn-outline !px-4 !py-2.5 text-xs"><Printer size={14} /> Print</button>
          <button onClick={async () => { const ok = await copyText(`${window.location.origin}/card/${m.id}?c=${data.code}`); toast[ok ? 'success' : 'error'](ok ? 'Card link copied' : 'Could not copy'); }} className="btn-outline !px-4 !py-2.5 text-xs"><Link2 size={14} /> Copy link</button>
        </div>
      </div>
    </section>
  );
}
