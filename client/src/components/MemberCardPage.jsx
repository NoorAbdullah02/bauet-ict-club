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


const condensed = { fontFamily: "'Barlow Condensed', 'Space Grotesk', system-ui, sans-serif" };

/** The portrait membership badge (lanyard card): navy side strip with the club, the post, the photo, then name, department, QR and session.
 *  Every size is relative to the card width (cqw), so it looks the same on a 320 px phone and on a printed page. */
function Badge({ m, code, qr, verified }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const move = (e) => {
    if (e.pointerType === 'touch') return;
    const r = e.currentTarget.getBoundingClientRect();
    setTilt({ x: ((e.clientY - r.top) / r.height - 0.5) * -7, y: ((e.clientX - r.left) / r.width - 0.5) * 7 });
  };
  const session = (m.session || '').replace(/^Member since /, 'Since ') || 'BAUET ICT Club';
  const post = String(m.position || 'Member');
  const name = String(m.name || '');
  const postFs = post.length > 22 ? 7.6 : post.length > 13 ? 10.5 : 14;
  const nameFs = name.length > 26 ? 6.6 : name.length > 16 ? 8.6 : 11;
  const c = (v) => `${v}cqw`;
  return (
    <motion.div initial={{ opacity: 0, y: 26, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} style={{ perspective: 1200 }}>
      {/* wrapper = the container whose width every size below is measured against (cqw) */}
      <div className="mx-auto w-full max-w-[372px]" style={{ containerType: 'inline-size' }}>
      <div onPointerMove={move} onPointerLeave={() => setTilt({ x: 0, y: 0 })}
        className="member-badge relative aspect-[9/16] w-full shadow-[0_40px_90px_rgba(6,20,64,0.45)] transition-transform duration-200 ease-out print:shadow-none"
        style={{ padding: c(1.7), borderRadius: c(8), background: 'linear-gradient(145deg,#35D989 0%,#38C8F0 35%,#8B5CF6 70%,#FF6B8A 100%)', transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`, transformStyle: 'preserve-3d' }}>
      <div className="relative size-full overflow-hidden bg-white text-[#0A1A3F]" style={{ containerType: 'inline-size', borderRadius: c(6.4) }}>

        <div aria-hidden="true" className="absolute inset-0" style={{ background: 'radial-gradient(70% 45% at 78% 40%, rgba(56,200,240,0.22), transparent 70%), radial-gradient(60% 40% at 90% 15%, rgba(53,217,137,0.18), transparent 70%), linear-gradient(180deg,#FFFFFF,#F3F6FC)' }} />
        <div aria-hidden="true" className="absolute select-none leading-none" style={{ ...condensed, right: c(5), top: c(36), fontWeight: 700, fontSize: c(30), letterSpacing: '-0.02em', color: 'rgba(11,42,120,0.07)' }}>ICT</div>

        {/* left navy strip */}
        <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: c(27), background: 'linear-gradient(180deg,#061440 0%,#0B2A78 60%,#0A4D8F 100%)' }}>
          <div aria-hidden="true" className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.10) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.10) 1px, transparent 1px)', backgroundSize: `${c(6)} ${c(6)}` }} />
          <div aria-hidden="true" className="absolute rounded-full bg-[#2B63FF]/40 blur-3xl" style={{ left: c(-10), top: c(60), width: c(40), height: c(40) }} />
          <div className="relative mx-auto bg-white shadow-lg" style={{ marginTop: c(5), width: c(21), padding: c(1.6), borderRadius: c(4) }}><Logo kind="club" height={36} className="mx-auto !h-auto w-full" /></div>
          <div className="relative mx-auto grid place-items-center rounded-full bg-white shadow-md" style={{ marginTop: c(3), width: c(13), height: c(13) }}><Logo kind="crest" height={28} className="!h-[78%] w-auto" /></div>
          <div className="absolute inset-x-0 grid place-items-center" style={{ top: '25%', bottom: '38%' }}>
            <span className="whitespace-nowrap font-semibold uppercase text-white" style={{ ...condensed, writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: c(6.4), letterSpacing: '0.2em' }}>BAUET ICT Club</span>
          </div>
          <span aria-hidden="true" className="absolute left-1/2 h-px -translate-x-1/2 bg-gradient-to-r from-transparent via-[#7CF0B2] to-transparent" style={{ top: '23%', width: c(9) }} />
        </div>

        {/* the post, big */}
        <div className="absolute right-0 top-0 text-center" style={{ left: c(27), padding: `${c(6)} ${c(4)} 0` }}>
          <h1 className="font-bold uppercase tracking-tight text-[#0A1A3F]" style={{ ...condensed, fontSize: c(postFs), lineHeight: 0.92 }}>{post}</h1>
          <p className="inline-flex items-center rounded-full bg-[#0B2A78]/[0.07] font-mono uppercase text-[#0B2A78]" style={{ marginTop: c(2), gap: c(1.2), padding: `${c(0.9)} ${c(2.6)}`, fontSize: c(2.5), letterSpacing: '0.18em' }}>
            <i className={`rounded-full ${m.current ? 'bg-[#16A34A]' : 'bg-slate-400'}`} style={{ width: c(1.6), height: c(1.6) }} /> {m.current ? 'Active member' : 'Former member'}
          </p>
        </div>

        {/* photo, fading into the grey panel */}
        <div className="absolute right-0" style={{ left: c(27), top: '20%', height: '49%' }}>
          <div aria-hidden="true" className="absolute bottom-0" style={{ left: '8%', right: '8%', top: '12%', borderRadius: '44% 44% 0 0 / 38% 38% 0 0', background: 'linear-gradient(160deg,#35D989 0%,#38C8F0 55%,#8B5CF6 120%)' }} />
          <div className="absolute bottom-0 overflow-hidden bg-[#0B2A78]/90" style={{ left: '10.5%', right: '10.5%', top: '13.5%', borderRadius: '42% 42% 0 0 / 36% 36% 0 0', WebkitMaskImage: 'linear-gradient(180deg,#000 82%,transparent)', maskImage: 'linear-gradient(180deg,#000 82%,transparent)' }}>
            {m.image_url
              ? <img src={thumb(m.image_url, 640)} alt={m.name} className="size-full object-cover object-top" />
              : <div className="grid size-full place-items-center font-bold text-white/90" style={{ ...condensed, fontSize: c(20) }}>{initials(m.name)}</div>}
          </div>
        </div>

        {/* grey bottom panel with the raised tab on the right */}
        <svg aria-hidden="true" viewBox="0 0 100 40" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 w-full drop-shadow-[0_-8px_14px_rgba(6,20,64,0.12)]" style={{ height: '37%' }}>
          <defs><linearGradient id="panel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#EEF1F7" /><stop offset="1" stopColor="#D3D9E6" /></linearGradient></defs>
          <path d="M0 9 Q0 7 2.5 6 L8 3.5 Q10 2.5 13 2.5 L48 2.5 Q52 2.5 54 1.2 Q56 0 59 0 L100 0 L100 40 L0 40 Z" fill="url(#panel)" />
        </svg>

        <div className="absolute inset-x-0 bottom-0 flex items-stretch" style={{ height: '33%', padding: `0 ${c(9)} ${c(5.5)} ${c(7)}`, gap: c(3) }}>
          <div className="flex min-w-0 flex-1 flex-col justify-end" style={{ gap: c(2.2) }}>
            <div className="min-w-0">
              <h2 className="line-clamp-2 font-bold uppercase tracking-tight text-[#3B4658]" style={{ ...condensed, fontSize: c(nameFs), lineHeight: 0.92 }}>{name}</h2>
              <p className="flex flex-wrap items-center font-bold italic text-[#0A1A3F]" style={{ ...condensed, marginTop: c(1.6), gap: c(2), fontSize: c(6.6), lineHeight: 1 }}>
                {m.department || 'BAUET'}
                {m.batch ? <span className="rounded bg-[#0B2A78] not-italic text-white" style={{ fontSize: c(3.6), padding: `${c(0.5)} ${c(1.6)}`, letterSpacing: '0.04em' }}>Batch {m.batch}</span> : null}
              </p>
            </div>
            <div>
              <p className="font-mono uppercase text-[#64748B]" style={{ fontSize: c(2.3), letterSpacing: '0.2em' }}>Card code</p>
              <p className="whitespace-nowrap font-mono text-[#0A1A3F]" style={{ fontSize: c(3.5), letterSpacing: '0.1em' }}>{code}</p>
            </div>
          </div>
          <div className="relative flex shrink-0 items-center justify-center self-end border-[#0A1A3F] bg-white/80" style={{ width: c(26), height: c(26), borderWidth: c(0.8), borderStyle: 'solid', borderRadius: c(5), padding: c(1.4) }}>
            <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#DDE2EC] font-extrabold uppercase text-[#0A1A3F]" style={{ top: c(-1.9), padding: `0 ${c(1.4)}`, fontSize: c(2.7), letterSpacing: '0.14em' }}>Scan me</span>
            {qr ? <img src={qr} alt="QR code of this card" className="size-full rounded-md" /> : <Loader2 className="animate-spin text-slate-400" />}
          </div>
        </div>
        {/* year / session, turned sideways like the printed design */}
        <span className="absolute whitespace-nowrap font-semibold uppercase text-[#0A1A3F]" style={{ ...condensed, right: c(2.6), bottom: c(6), transformOrigin: 'bottom right', transform: 'rotate(-90deg) translate(100%, 0)', fontSize: c(4), letterSpacing: '0.18em' }}>{session}</span>

        {verified && <span className="absolute z-10 inline-flex items-center rounded-full bg-emerald-500 font-bold text-white shadow-lg" style={{ left: c(30), top: '17%', gap: c(1), padding: `${c(1)} ${c(2.6)}`, fontSize: c(2.8) }}><BadgeCheck style={{ width: c(3.2), height: c(3.2) }} /> Verified</span>}
        <div aria-hidden="true" className="badge-sheen pointer-events-none absolute inset-0" />
      </div>
      </div>
      </div>
    </motion.div>
  );
}

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
        <Badge m={m} code={data.code} qr={qr} verified={checked && data.verified} />
        <div className="mt-5 flex flex-wrap justify-center gap-2 print:hidden">
          <button onClick={() => window.print()} className="btn-outline !px-4 !py-2.5 text-xs"><Printer size={14} /> Print</button>
          <button onClick={async () => { const ok = await copyText(`${window.location.origin}/card/${m.id}?c=${data.code}`); toast[ok ? 'success' : 'error'](ok ? 'Card link copied' : 'Could not copy'); }} className="btn-outline !px-4 !py-2.5 text-xs"><Link2 size={14} /> Copy link</button>
        </div>
      </div>
    </section>
  );
}
