import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BadgeCheck, Loader2, Download, Link2, ShieldAlert, Share2, Facebook, Globe, MessageCircle, Send, Mail, Linkedin, Twitter, RefreshCw, User, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../context/store';
import useStore from '../context/store';
import { qrDataUrl } from '../lib/qr';
import { thumb } from '../lib/img';
import { copyText, nativeShare, shareLinks } from '../lib/share';
import Logo from './Logo';

const fileName = (m) => `${String(m.name || 'member').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')}-BAUET-ICT-Club-card.png`;
const touchPhone = () => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;

/** The card as a picture file (1080 x 1920). */
async function cardFile(m, code, qr, extra) {
  const { cardToBlob } = await import('../lib/cardImage');
  const blob = await cardToBlob({ m, code, qr, width: 1080, ...extra });
  return new File([blob], fileName(m), { type: 'image/png' });
}

/** Download: a file on a computer; on a phone the system sheet (Save to gallery / Files / send) when the browser has one, else a normal download. */
async function downloadCard(m, code, qr, extra) {
  const file = await cardFile(m, code, qr, extra);
  if (touchPhone() && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'My BAUET ICT Club card' }); return; } catch (e) { if (e?.name === 'AbortError') return; /* else fall back to a plain download */ }
  }
  const url = URL.createObjectURL(file);
  const a = Object.assign(document.createElement('a'), { href: url, download: file.name, rel: 'noopener' });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/** Share the card as a picture together with its link (WhatsApp, Messenger, Telegram, Facebook app... all show it). Returns false when the browser cannot share files. */
async function shareCardPicture(m, code, qr, extra, text, url) {
  const file = await cardFile(m, code, qr, extra);
  if (!navigator.canShare?.({ files: [file] })) return false;
  try { await navigator.share({ files: [file], title: `${m.name} | BAUET ICT Club`, text: `${text}\n${url}` }); } catch (e) { if (e?.name !== 'AbortError') throw e; }
  return true;
}

/** "https://www.facebook.com/bauetictclub" -> "fb.com/bauetictclub" (short enough to sit on the card). */
export const fbShort = (u = '') => { try { return new URL(u).pathname.replace(/^\/|\/$/g, ''); } catch { return ''; } };

const initials = (n = '') => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();


/** Share this card: Facebook, WhatsApp, Telegram, X, LinkedIn, e-mail, the phone's own share sheet, or copy the link. */
function ShareMenu({ url, title, text, onPicture }) {
  const [open, setOpen] = useState(false);
  const links = shareLinks(url, text);
  const items = [
    [Facebook, 'Facebook', links.facebook, '#1877F2'],
    [MessageCircle, 'WhatsApp', links.whatsapp, '#25D366'],
    [Send, 'Telegram', links.telegram, '#229ED9'],
    [Twitter, 'X', `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '#111827'],
    [Linkedin, 'LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '#0A66C2'],
    [Mail, 'E-mail', `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n${url}`)}`, '#EA4335'],
  ];
  useEffect(() => {
    if (!open) return undefined;
    const off = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', off);
    return () => window.removeEventListener('keydown', off);
  }, [open]);
  const copy = async () => { const ok = await copyText(url); toast[ok ? 'success' : 'error'](ok ? 'Card link copied' : 'Could not copy'); setOpen(false); };
  const more = async () => { if (await nativeShare({ title, text, url })) setOpen(false); };
  const picture = async () => { try { const ok = await onPicture(); if (ok) setOpen(false); else toast.error('Your browser cannot share pictures. Use Download, then share the saved picture.'); } catch { toast.error('Could not prepare the picture. Try again.'); } };
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} className="btn-primary !px-5 !py-2.5 text-xs"><Share2 size={14} /> Share</button>
      {open && (
        <>
          <button aria-label="Close share menu" onClick={() => setOpen(false)} className="fixed inset-0 z-40 cursor-default bg-black/30 backdrop-blur-[2px]" />
          <div role="menu" className="fixed inset-x-3 bottom-3 z-50 mx-auto w-auto max-w-sm rounded-3xl border border-line bg-surface p-4 shadow-[var(--shadow-xl)] sm:absolute sm:inset-auto sm:bottom-full sm:left-1/2 sm:mb-3 sm:w-80 sm:-translate-x-1/2">
            <div className="mb-3 flex items-center justify-between"><h3 className="text-base font-semibold text-fg">Share this card</h3><button onClick={() => setOpen(false)} aria-label="Close" className="grid size-8 place-items-center rounded-full text-fg2 hover:bg-alt">&times;</button></div>
            <div className="grid grid-cols-3 gap-2.5">
              {items.map(([I, label, href, color]) => (
                <a key={label} role="menuitem" href={href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className="flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-bg px-2 py-3 text-[12px] font-medium text-fg2 transition hover:-translate-y-0.5 hover:border-transparent hover:shadow-[var(--shadow-md)]">
                  <span className="grid size-10 place-items-center rounded-full text-white" style={{ background: color }}><I size={18} /></span>{label}
                </a>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button role="menuitem" onClick={copy} className="btn-outline !flex-1 !justify-center !px-3 !py-2.5 text-xs"><Link2 size={14} /> Copy link</button>
              {onPicture && <button role="menuitem" onClick={picture} className="btn-outline !flex-1 !justify-center !px-3 !py-2.5 text-xs"><Download size={14} /> Share picture</button>}
              {typeof navigator !== 'undefined' && navigator.share && <button role="menuitem" onClick={more} className="btn-outline !flex-1 !justify-center !px-3 !py-2.5 text-xs"><Share2 size={14} /> More apps</button>}
            </div>
            <p className="mt-2.5 break-all rounded-xl bg-alt px-3 py-2 font-mono text-[10.5px] text-muted">{url}</p>
          </div>
        </>
      )}
    </div>
  );
}

const condensed = { fontFamily: "'Barlow Condensed', 'Space Grotesk', system-ui, sans-serif" };

function BadgeBack({ m, code, qr, c }) {
  return (
    <div className="relative size-full overflow-hidden bg-gradient-to-br from-[#061440] via-[#0B2A78] to-[#0A1A3F] text-white" style={{ containerType: 'inline-size', borderRadius: c(6.4) }}>
      {/* Magnetic stripe */}
      <div className="absolute inset-x-0 bg-[#0A0F1D] shadow-inner" style={{ top: c(6), height: c(12) }} />
      
      {/* Club guidelines and rules */}
      <div className="absolute inset-x-0 flex flex-col justify-between" style={{ top: c(22), bottom: c(4), padding: `0 ${c(5)}` }}>
        <div>
          <div className="flex items-center gap-2 border-b border-white/10 pb-2">
            <Logo kind="club" height={24} className="!h-auto w-8 brightness-200" />
            <div>
              <p className="font-bold uppercase tracking-wider text-white" style={{ fontSize: c(3.2) }}>BAUET ICT Club</p>
              <p className="font-mono text-[#7CF0B2]" style={{ fontSize: c(2.4) }}>Innovate • Code • Inspire</p>
            </div>
          </div>

          <div className="mt-2 space-y-1.5 leading-relaxed text-slate-300" style={{ fontSize: c(2.4) }}>
            <p>1. This digital credential verifies active affiliation with BAUET ICT Club.</p>
            <p>2. Entitles bearer to workshops, university hackathons & club facilities.</p>
            <p>3. Non-transferable; must be presented upon request with student ID card.</p>
            <p>4. Inquiries & lost card reporting: <b className="text-white">ictclubbauet@gmail.com</b></p>
          </div>
        </div>

        {/* Bottom signatory & chip watermark */}
        <div>
          <div className="flex items-end justify-between border-t border-white/10 pt-2">
            <div>
              <p className="font-mono uppercase tracking-wider text-slate-400" style={{ fontSize: c(2.2) }}>Card ID</p>
              <p className="font-mono font-bold text-[#7CF0B2]" style={{ fontSize: c(3) }}>&lt;ICT/&gt; {code}</p>
            </div>
            <div className="text-right">
              <div className="font-display italic text-amber-300" style={{ fontSize: c(3.2) }}>Executive Council</div>
              <p className="uppercase tracking-widest text-slate-400" style={{ fontSize: c(2) }}>Authorized Signatory</p>
            </div>
          </div>
          <p className="mt-2 text-center font-mono text-slate-400" style={{ fontSize: c(2) }}>
            Qadirabad Cantonment, Natore-6431, Bangladesh
          </p>
        </div>
      </div>
    </div>
  );
}

/** The portrait membership badge (lanyard card): navy side strip with the club, the post, the photo, then name, department, QR and session.
 *  Every size is relative to the card width (cqw), so it looks the same on a 320 px phone and on a printed page. */
function Badge({ m, code, qr, verified, site, fb, flipped }) {
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
      <div className="member-wrap mx-auto w-full max-w-[372px]" style={{ containerType: 'inline-size' }}>
      <div onPointerMove={move} onPointerLeave={() => setTilt({ x: 0, y: 0 })}
        className="member-badge relative aspect-[9/16] w-full shadow-[0_40px_90px_rgba(6,20,64,0.45)] transition-transform duration-200 ease-out print:shadow-none"
        style={{ padding: c(1.7), borderRadius: c(8), background: 'linear-gradient(145deg,#35D989 0%,#38C8F0 35%,#8B5CF6 70%,#FF6B8A 100%)', transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`, transformStyle: 'preserve-3d' }}>
      
      {flipped ? (
        <BadgeBack m={m} code={code} qr={qr} c={c} />
      ) : (
      <div className="relative size-full overflow-hidden bg-white text-[#0A1A3F]" style={{ containerType: 'inline-size', borderRadius: c(6.4) }}>

        <div aria-hidden="true" className="absolute inset-0" style={{ background: 'radial-gradient(70% 45% at 78% 40%, rgba(56,200,240,0.22), transparent 70%), radial-gradient(60% 40% at 90% 15%, rgba(53,217,137,0.18), transparent 70%), linear-gradient(180deg,#FFFFFF,#F3F6FC)' }} />
        <div aria-hidden="true" className="absolute select-none leading-none" style={{ ...condensed, right: c(5), top: c(36), fontWeight: 700, fontSize: c(30), letterSpacing: '-0.02em', color: 'rgba(11,42,120,0.07)' }}>ICT</div>

        {/* left navy strip */}
        <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: c(27), background: 'linear-gradient(180deg,#061440 0%,#0B2A78 60%,#0A4D8F 100%)' }}>
          <div aria-hidden="true" className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.10) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.10) 1px, transparent 1px)', backgroundSize: `${c(6)} ${c(6)}` }} />
          <div aria-hidden="true" className="absolute rounded-full bg-[#2B63FF]/40 blur-3xl" style={{ left: c(-10), top: c(60), width: c(40), height: c(40) }} />
          <div className="relative mx-auto bg-white shadow-lg" style={{ marginTop: c(5), width: c(21), padding: c(1.6), borderRadius: c(4) }}><Logo kind="club" height={36} className="mx-auto !h-auto w-full" /></div>
          <div className="absolute inset-x-0 grid place-items-center" style={{ top: '25%', bottom: '38%' }}>
            <span className="whitespace-nowrap font-semibold uppercase text-white" style={{ ...condensed, writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: c(6.4), letterSpacing: '0.2em' }}>BAUET ICT Club</span>
          </div>
          <span aria-hidden="true" className="absolute left-1/2 h-px -translate-x-1/2 bg-gradient-to-r from-transparent via-[#7CF0B2] to-transparent" style={{ top: '23%', width: c(9) }} />
        </div>

        {/* golden smart chip graphic */}
        <div className="absolute overflow-hidden rounded-md border border-[#D4AF37]/80 bg-gradient-to-br from-[#FFE89E] via-[#F0C05A] to-[#B8860B] shadow-sm select-none pointer-events-none" style={{ left: c(29.5), top: '11.5%', width: c(9.5), height: c(7), padding: c(0.4) }}>
          <div className="grid size-full grid-cols-2 grid-rows-2 gap-[1px] rounded-[2px] border border-[#7A5B0B]/40">
            <div className="border-r border-b border-[#7A5B0B]/30" />
            <div className="border-b border-[#7A5B0B]/30" />
            <div className="border-r border-[#7A5B0B]/30" />
            <div />
          </div>
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

        <div className="absolute inset-x-0 bottom-0 flex items-stretch" style={{ height: '33%', padding: `0 ${c(10.5)} ${c(11.5)} ${c(7)}`, gap: c(3) }}>
          <div className="flex min-w-0 flex-1 flex-col justify-end" style={{ gap: c(2.2) }}>
            <div className="min-w-0">
              <h2 className="line-clamp-2 font-bold uppercase tracking-tight text-[#3B4658]" style={{ ...condensed, fontSize: c(nameFs), lineHeight: 0.92 }}>{name}</h2>
              <p className="flex flex-wrap items-center font-bold italic text-[#0A1A3F]" style={{ ...condensed, marginTop: c(1.6), gap: c(2), fontSize: c(6.6), lineHeight: 1 }}>
                {m.department || 'BAUET'}
                {m.batch ? <span className="rounded bg-[#0B2A78] not-italic text-white" style={{ fontSize: c(3.6), padding: `${c(0.5)} ${c(1.6)}`, letterSpacing: '0.04em' }}>Batch {m.batch}</span> : null}
              </p>
            </div>
            <div>
              <p className="font-mono uppercase text-[#64748B]" style={{ fontSize: c(2.3), letterSpacing: '0.2em' }}>Member ID</p>
              <p className="flex items-center whitespace-nowrap font-mono text-[#0A1A3F]" style={{ gap: c(1.6), fontSize: c(3.5), letterSpacing: '0.08em' }}>
                <span className="rounded bg-[#0A1A3F] font-bold text-[#7CF0B2]" style={{ padding: `${c(0.4)} ${c(1.4)}`, fontSize: c(3), letterSpacing: '0.02em' }}>&lt;ICT/&gt;</span>{code}
              </p>
            </div>
          </div>
          <div className="relative flex shrink-0 items-center justify-center self-end border-[#0A1A3F] bg-white/80" style={{ width: c(24.5), height: c(24.5), borderWidth: c(0.8), borderStyle: 'solid', borderRadius: c(5), padding: c(1.4) }}>
            <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#DDE2EC] font-extrabold uppercase text-[#0A1A3F]" style={{ top: c(-1.9), padding: `0 ${c(1.4)}`, fontSize: c(2.7), letterSpacing: '0.14em' }}>Scan me</span>
            {qr ? <img src={qr} alt="QR code of this card" className="size-full rounded-md" /> : <Loader2 className="animate-spin text-slate-400" />}
          </div>
        </div>
        {/* year / session, turned sideways like the printed design */}
        <span className="absolute whitespace-nowrap font-semibold uppercase text-[#0A1A3F]" style={{ ...condensed, right: c(2.6), bottom: c(12), transformOrigin: 'bottom right', transform: 'rotate(-90deg) translate(100%, 0)', fontSize: c(4), letterSpacing: '0.18em' }}>{session}</span>

        {verified && <span className="absolute z-10 inline-flex items-center rounded-full bg-emerald-500 font-bold text-white shadow-lg" style={{ left: c(30), top: '17%', gap: c(1), padding: `${c(1)} ${c(2.6)}`, fontSize: c(2.8) }}><BadgeCheck style={{ width: c(3.2), height: c(3.2) }} /> Verified</span>}
        {/* website and Facebook, so a shared or printed card always points back to the club */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center whitespace-nowrap font-mono text-white/90" style={{ height: c(6.6), gap: c(3), fontSize: c(2.45), letterSpacing: '0.03em', background: 'linear-gradient(90deg,#061440,#0B2A78 60%,#0A4D8F)' }}>
          {site && <span className="inline-flex items-center" style={{ gap: c(1.2) }}><Globe style={{ width: c(3.4), height: c(3.4) }} className="text-[#7CF0B2]" />{site}</span>}
          {site && fb && <i aria-hidden="true" className="rounded-full bg-white/40" style={{ width: c(0.8), height: c(0.8) }} />}
          {fb && <span className="inline-flex items-center" style={{ gap: c(1.2) }}><span className="grid place-items-center rounded-full bg-[#1877F2]" style={{ width: c(3.8), height: c(3.8) }}><Facebook className="text-white" style={{ width: c(2.4), height: c(2.4) }} /></span>{fb}</span>}
        </div>
        <div aria-hidden="true" className="badge-sheen pointer-events-none absolute inset-0" />
      </div>
      )}
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
  const [saving, setSaving] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const fbLink = useStore((st) => st.settings?.socialLinks?.fb) || 'https://www.facebook.com/bauetictclub';

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
  const profileUrl = `/member/${m.id}${c ? `?c=${data.code}` : ''}`;

  return (
    <section className="section">
      <div className="container max-w-md">
        {checked && (
          <div className={`mb-4 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${data.verified ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'}`}>
            {data.verified ? <><BadgeCheck size={18} /> Genuine card: this person is a member of BAUET ICT Club.</> : <><ShieldAlert size={18} /> This code does not match the card. Do not trust it.</>}
          </div>
        )}
        <Badge m={m} code={data.code} qr={qr} verified={checked && data.verified} site={window.location.host} fb={fbShort(fbLink)} flipped={flipped} />
        
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 print:hidden">
          <button
            onClick={() => setFlipped((f) => !f)}
            className="btn-outline !px-4 !py-2.5 text-xs inline-flex items-center gap-1.5"
            title="Flip to back / front"
          >
            <RefreshCw size={14} className={flipped ? 'rotate-180 transition-transform' : 'transition-transform'} />
            {flipped ? 'Show Front' : 'Flip to Back'}
          </button>

          <Link
            to={profileUrl}
            className="btn-outline !px-4 !py-2.5 text-xs inline-flex items-center gap-1.5 !border-accent/40 text-accent hover:!bg-accent/10"
          >
            <User size={14} /> Full Profile
          </Link>

          <button
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await downloadCard(m, data.code, qr, { site: window.location.host, fb: fbShort(fbLink) });
                toast.success('Card saved as a picture');
              } catch {
                toast.error('Could not save the card. Try again.');
              }
              setSaving(false);
            }}
            className="btn-outline !px-4 !py-2.5 text-xs disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Download
          </button>

          <ShareMenu
            url={`${window.location.origin}/card/${m.id}?c=${data.code}`}
            title={`${m.name} | BAUET ICT Club`}
            text={`${m.name}, ${m.position || 'Member'} at BAUET ICT Club`}
            onPicture={() => shareCardPicture(m, data.code, qr, { site: window.location.host, fb: fbShort(fbLink) }, `${m.name}, ${m.position || 'Member'} at BAUET ICT Club`, `${window.location.origin}/card/${m.id}?c=${data.code}`)}
          />
        </div>
      </div>
    </section>
  );
}
