import { useEffect, useState, useRef } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BadgeCheck, Loader2, Award, Calendar, Share2, Copy, Check, Download, ExternalLink, Sparkles, CreditCard, Shield, Flame, BookOpen, Camera, Zap, CheckCircle2, Cake, Mail, KeyRound } from 'lucide-react';
import { Facebook, Github, Linkedin } from '../lib/brandIcons';
import toast from 'react-hot-toast';
import { api } from '../context/store';
import { formalDate } from '../lib/format';
import { prettyCode } from '../lib/qr';
import { thumb } from '../lib/img';
import { copyText } from '../lib/share';
import { compressImage } from '../lib/compressImage';

const BADGE_MAP = {
  first: { name: 'First Step', icon: '🌱', desc: 'Attended 1st Club Event' },
  regular: { name: 'Regular Member', icon: '⭐', desc: 'Attended 3+ Events' },
  star: { name: 'Club Star', icon: '🏅', desc: 'Attended 5+ Events' },
  legend: { name: 'Club Legend', icon: '🏆', desc: 'Attended 10+ Events' },
  helper: { name: 'Team Helper', icon: '🤝', desc: 'Earned Volunteer Bonus' },
  century: { name: 'Century Club', icon: '💯', desc: '100+ Club Points' },
};

export default function MemberProfile() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const c = params.get('c') || '';
  const [data, setData] = useState(null); // null = loading, false = not found
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingDob, setEditingDob] = useState(false);
  const [dobValue, setDobValue] = useState('');
  const [savingDob, setSavingDob] = useState(false);
  const fileInputRef = useRef(null);
  // changing a photo or a birth date needs proof that it is really you: a code sent to the e-mail you joined with
  const proofRef = useRef('');
  const retry = useRef(null);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [vEmail, setVEmail] = useState('');
  const [vCode, setVCode] = useState('');
  const [vSent, setVSent] = useState(false);
  const [vBusy, setVBusy] = useState(false);
  const [vMsg, setVMsg] = useState('');

  /** Runs a change; when the server asks who you are, it is held until the e-mail code is confirmed, then repeated. */
  const attempt = async (fn) => {
    try { await fn(); return true; }
    catch (err) {
      if (err.response?.data?.needs_otp) { retry.current = fn; setVerifyOpen(true); setVSent(false); setVMsg(''); return false; }
      throw err;
    }
  };

  const requestCode = async (e) => {
    if (e) e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vEmail.trim())) { setVMsg('Type the e-mail you joined the club with.'); return; }
    setVBusy(true); setVMsg('');
    try {
      const r = await api.post('/card/otp/request', { email: vEmail.trim(), memberId: m?.id });
      setVSent(true);
      setVMsg(r.data?.message || 'A 6-digit code is on its way.');
    } catch (err) {
      setVMsg(err.response?.data?.error || 'Could not send the code. Try again in a minute.');
    }
    setVBusy(false);
  };

  const confirmCode = async (e) => {
    e.preventDefault();
    if (vCode.trim().length < 6) { setVMsg('Type the 6-digit code.'); return; }
    setVBusy(true); setVMsg('');
    try {
      const r = await api.post('/card/otp/verify', { email: vEmail.trim(), code: vCode.trim() });
      proofRef.current = r.data?.edit || '';
      setVerifyOpen(false); setVCode(''); setVSent(false);
      const again = retry.current; retry.current = null;
      if (again) { try { await again(); } catch (err) { toast.error(err.response?.data?.error || 'Could not save the change'); } }
      else toast.success('Confirmed. You can change your details now.');
    } catch (err) {
      setVMsg(err.response?.data?.error || 'That code is not right, or it has expired.');
    }
    setVBusy(false);
  };

  const handleSaveDob = async (e) => {
    if (e) e.preventDefault();
    if (!dobValue) return toast.error('Please choose a date of birth');
    setSavingDob(true);
    const save = async () => {
      await api.patch(`/card/${id}/birthdate`, { code: data.code, proof: proofRef.current || undefined, birth_date: dobValue });
      setData((prev) => ({ ...prev, member: { ...prev.member, birth_date: dobValue } }));
      setEditingDob(false);
      toast.success('Date of birth updated successfully!');
    };
    try { await attempt(save); } catch (err) { toast.error(err.response?.data?.error || 'Could not update date of birth'); }
    setSavingDob(false);
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return toast.error('Please choose a JPG or PNG image');
    }
    if (file.size > 15 * 1024 * 1024) {
      return toast.error('Image must be under 15MB');
    }

    setUploading(true);
    try {
      const small = await compressImage(file, { max: 1200 });
      const fd = new FormData();
      fd.append('photo', small);
      const uploadRes = await api.post('/registrations/photo', fd);
      const newUrl = uploadRes.data.url;
      const save = async () => {
        await api.patch(`/card/${id}/photo`, { code: data.code, proof: proofRef.current || undefined, photo_url: newUrl });
        setData((prev) => ({ ...prev, member: { ...prev.member, image_url: newUrl } }));
        toast.success('Profile photo updated successfully!');
      };
      await attempt(save);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not update profile photo');
    }
    setUploading(false);
  };

  useEffect(() => {
    api.get(`/card/${id}`, { params: c ? { c } : {} })
      .then((r) => setData(r.data))
      .catch(() => setData(false));
  }, [id, c]);

  useEffect(() => {
    if (data?.member) {
      document.title = `${data.member.name} - Profile | BAUET ICT Club`;
    }
  }, [data]);

  const copyProfile = async () => {
    const ok = await copyText(window.location.href);
    if (ok) {
      setCopied(true);
      toast.success('Profile link copied!');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Could not copy link');
    }
  };

  if (data === null) {
    return (
      <section className="section">
        <div className="container grid min-h-[50vh] place-items-center">
          <Loader2 className="animate-spin text-accent size-10" />
        </div>
      </section>
    );
  }

  if (data === false) {
    return (
      <section className="section">
        <div className="container grid min-h-[40vh] place-items-center text-center">
          <div>
            <h1 className="text-3xl font-bold text-fg">Member Not Found</h1>
            <p className="mt-2 text-fg2">We could not find a verified profile for this member.</p>
            <Link to="/team" className="btn-primary mt-6 inline-flex">Explore Club Team</Link>
          </div>
        </div>
      </section>
    );
  }

  const m = data.member;
  const stats = data.stats || { points: 0, eventsCount: 0, certificates: [] };
  const cardLink = `/card/${m.id}${data.code ? `?c=${data.code}` : ''}`;

  return (
    <section className="section">
      <div className="container max-w-4xl">
        {/* Profile Card Container */}
        <div className="relative overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow-xl)]">
          
          {/* Header Banner */}
          <div className="relative h-44 sm:h-56 w-full overflow-hidden bg-gradient-to-r from-[#061440] via-[#0B2A78] to-[#1F4FD8]">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
            <div className="absolute -right-16 -top-16 size-64 rounded-full bg-accent/20 blur-3xl" />
            <div className="absolute bottom-4 left-6 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-emerald-400">
              <span className="flex size-2 rounded-full bg-emerald-400 animate-ping" />
              Verified BAUET Tech Leader
            </div>
          </div>

          {/* Profile Header Content */}
          <div className="relative px-6 sm:px-10 pb-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 -mt-16 sm:-mt-20">
              {/* Photo & Role */}
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
                <div className="group relative size-32 sm:size-36 shrink-0 rounded-3xl border-4 border-surface bg-bg shadow-2xl overflow-hidden ring-4 ring-accent/20">
                  {m.image_url ? (
                    <img src={thumb(m.image_url, 400)} alt={m.name} loading="lazy" decoding="async" className="size-full object-cover object-top" />
                  ) : (
                    <div className="grid size-full place-items-center bg-gradient-to-br from-accent/20 to-accent/5 font-display text-4xl font-bold text-accent">
                      {m.name.charAt(0)}
                    </div>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 grid place-items-center bg-black/60 text-white z-20">
                      <Loader2 size={24} className="animate-spin text-accent" />
                    </div>
                  )}
                  {data.code && !uploading && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title="Click to change photo"
                      className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px] z-10 cursor-pointer"
                    >
                      <Camera size={22} className="mb-1 text-accent" />
                      <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Change Photo</span>
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    onChange={handlePhotoChange}
                  />
                  {data.verified && !uploading && (
                    <span title="Verified Member" className="absolute bottom-2 right-2 flex size-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md pointer-events-none z-10">
                      <BadgeCheck size={16} />
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 font-mono text-xs font-semibold text-accent">
                    <Shield size={13} /> {m.position || 'Member'}
                  </div>
                  <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight text-fg">
                    {m.name}
                  </h1>
                  <p className="mt-1 text-sm font-medium text-fg2">
                    {m.department || 'BAUET'}{m.batch ? ` · Batch ${m.batch}` : ''}
                    <span className="mx-2 text-muted">|</span>
                    <span className="font-mono text-xs text-muted">{m.session || 'Active Member'}</span>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5">
                <Link to={cardLink} className="btn-primary !px-4 !py-2.5 text-xs inline-flex items-center gap-2">
                  <CreditCard size={15} /> Digital Card
                </Link>
                <button onClick={copyProfile} className="btn-outline !px-4 !py-2.5 text-xs inline-flex items-center gap-2">
                  {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                  {copied ? 'Copied' : 'Share'}
                </button>
              </div>
            </div>

            {/* Social Handles */}
            {(m.social_li || m.social_gh || m.social_fb) && (
              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line/60 pt-4">
                <span className="text-xs font-mono uppercase tracking-wider text-muted">Connect:</span>
                {m.social_li && (
                  <a href={m.social_li} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-bg px-3 py-1.5 text-xs font-medium text-[#0A66C2] hover:bg-alt transition">
                    <Linkedin size={14} /> LinkedIn
                  </a>
                )}
                {m.social_gh && (
                  <a href={m.social_gh} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-bg px-3 py-1.5 text-xs font-medium text-fg hover:bg-alt transition">
                    <Github size={14} /> GitHub
                  </a>
                )}
                {m.social_fb && (
                  <a href={m.social_fb} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-bg px-3 py-1.5 text-xs font-medium text-[#1877F2] hover:bg-alt transition">
                    <Facebook size={14} /> Facebook
                  </a>
                )}
              </div>
            )}

            {/* Date of Birth (managed from profile) */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {m.birth_date ? (
                <div className="inline-flex items-center gap-2 rounded-xl border border-line bg-alt/50 px-3.5 py-1.5 text-xs text-fg">
                  <Cake size={14} className="text-pink-500" />
                  <span>Born {formalDate(m.birth_date)}</span>
                  {data.code && (
                    <button
                      type="button"
                      onClick={() => { setDobValue(m.birth_date); setEditingDob((v) => !v); }}
                      className="ml-1 text-[11px] font-semibold text-tech hover:underline cursor-pointer"
                    >
                      {editingDob ? 'Close' : 'Change'}
                    </button>
                  )}
                </div>
              ) : data.code ? (
                <button
                  type="button"
                  onClick={() => setEditingDob((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-tech/50 bg-tech/5 px-3.5 py-1.5 text-xs font-medium text-tech hover:bg-tech/10 cursor-pointer transition"
                >
                  <Cake size={14} /> Add Date of Birth
                </button>
              ) : null}

              {editingDob && (
                <form onSubmit={handleSaveDob} className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-2 shadow-sm">
                  <input
                    type="date"
                    required
                    value={dobValue}
                    onChange={(e) => setDobValue(e.target.value)}
                    className="rounded-lg border border-line bg-bg px-2.5 py-1 text-xs text-fg outline-none focus:border-tech"
                  />
                  <button type="submit" disabled={savingDob} className="btn-primary !px-3 !py-1 text-xs">
                    {savingDob ? <Loader2 size={12} className="animate-spin" /> : 'Save'}
                  </button>
                  <button type="button" onClick={() => setEditingDob(false)} className="btn-outline !px-3 !py-1 text-xs">
                    Cancel
                  </button>
                </form>
              )}
            </div>

            {/* proof that it is really you (only shown when the server asks for it) */}
            {verifyOpen && (
              <form onSubmit={vSent ? confirmCode : requestCode} className="mt-4 rounded-2xl border border-tech/40 bg-tech/5 p-4">
                <p className="flex items-center gap-2 text-xs font-semibold text-tech"><Shield size={14} /> Confirm it is you</p>
                <p className="mt-1 text-xs leading-5 text-fg2">
                  To change your photo or your date of birth, we send a 6-digit code to the e-mail you joined the club with.
                  A card code alone is public on the Team page, so it is not enough to change anything.
                </p>
                {!vSent ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input type="email" required autoComplete="email" value={vEmail} onChange={(e) => setVEmail(e.target.value)} placeholder="you@gmail.com" aria-label="Your e-mail" className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-fg outline-none focus:border-tech" />
                    <button type="submit" disabled={vBusy} className="btn-primary !px-3 !py-1.5 text-xs">
                      {vBusy ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />} Send code
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input inputMode="numeric" maxLength={6} required value={vCode} onChange={(e) => setVCode(e.target.value.replace(/\D/g, ''))} placeholder="123456" aria-label="6-digit code" className="w-28 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-center font-mono text-xs tracking-[0.2em] text-fg outline-none focus:border-tech" />
                    <button type="submit" disabled={vBusy} className="btn-primary !px-3 !py-1.5 text-xs">
                      {vBusy ? <Loader2 size={12} className="animate-spin" /> : <KeyRound size={12} />} Confirm
                    </button>
                    <button type="button" onClick={requestCode} disabled={vBusy} className="text-[11px] font-semibold text-tech hover:underline disabled:opacity-50">Send again</button>
                    <button type="button" onClick={() => { setVerifyOpen(false); setVSent(false); }} className="text-[11px] text-muted hover:underline">Cancel</button>
                  </div>
                )}
                {vMsg && <p role="status" className="mt-2 text-xs text-amber-600">{vMsg}</p>}
              </form>
            )}

            {/* Bio / About */}
            {m.bio && (
              <div className="mt-6 rounded-2xl bg-alt/60 p-4 text-sm text-fg2 leading-relaxed">
                {m.bio}
              </div>
            )}

            {/* Stats Grid */}
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              <div className="rounded-2xl border border-line bg-bg p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 text-amber-500">
                  <Flame size={18} />
                  <span className="font-display text-2xl font-bold text-fg">{stats.points || 0}</span>
                </div>
                <div className="mt-1 text-xs font-mono uppercase tracking-wider text-muted">Club XP / Points</div>
              </div>

              <div className="rounded-2xl border border-line bg-bg p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 text-accent">
                  <Calendar size={18} />
                  <span className="font-display text-2xl font-bold text-fg">{stats.eventsCount || 0}</span>
                </div>
                <div className="mt-1 text-xs font-mono uppercase tracking-wider text-muted">Events Attended</div>
              </div>

              <div className="col-span-2 sm:col-span-1 rounded-2xl border border-line bg-bg p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 text-emerald-500">
                  <Award size={18} />
                  <span className="font-display text-2xl font-bold text-fg">{stats.certificates?.length || 0}</span>
                </div>
                <div className="mt-1 text-xs font-mono uppercase tracking-wider text-muted">Certifications</div>
              </div>
            </div>

            {/* Contributions & Points Breakdown */}
            <div className="mt-6 rounded-2xl border border-line bg-alt/30 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-3.5">
                <div className="flex items-center gap-2">
                  <Zap className="text-amber-500" size={18} />
                  <h3 className="font-display text-base font-bold text-fg">Activity & Contribution Points</h3>
                </div>
                <span className="rounded-full bg-amber-500/10 px-3 py-1 font-mono text-xs font-bold text-amber-600">
                  Total: {stats.points || 0} XP
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-9 place-items-center rounded-lg bg-accent/10 text-accent font-bold text-xs">
                      10x
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-fg">Event Attendance</p>
                      <p className="text-[11px] text-muted">{stats.eventsCount || 0} events attended (+10 pts each)</p>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-bold text-emerald-600">
                    +{(stats.eventsCount || 0) * 10} pts
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-9 place-items-center rounded-lg bg-amber-500/10 text-amber-500 font-bold text-xs">
                      ★
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-fg">Tasks & Honors</p>
                      <p className="text-[11px] text-muted">{stats.awards?.length || 0} special contributions</p>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-bold text-amber-600">
                    +{(stats.awards || []).reduce((n, a) => n + (Number(a.points) || 0), 0)} pts
                  </span>
                </div>
              </div>

              {stats.awards && stats.awards.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted">Special Contribution Log:</p>
                  {stats.awards.map((award, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-lg bg-bg/80 px-3 py-2 text-xs">
                      <span className="font-medium text-fg">{award.reason || 'Contribution Bonus'}</span>
                      <span className="font-mono font-bold text-amber-500">+{award.points} pts</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Earned Certificates Section */}
            <div className="mt-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="flex items-center gap-2 text-xl font-bold text-fg">
                  <Award className="text-accent" size={20} /> Verified Certificates
                </h2>
                <span className="text-xs font-mono text-muted">
                  {stats.certificates?.length ? `${stats.certificates.length} credentials` : '0 earned'}
                </span>
              </div>

              {stats.certificates && stats.certificates.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {stats.certificates.map((cert) => {
                    const linkedInUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(cert.event + ' - Certificate')}&organizationName=${encodeURIComponent('BAUET ICT Club')}&certUrl=${encodeURIComponent(`${window.location.origin}/verify/${cert.code}`)}&certId=${encodeURIComponent(cert.code)}`;
                    return (
                      <div key={cert.code} className="flex flex-col justify-between rounded-2xl border border-line bg-bg p-4.5 transition hover:border-accent/40 hover:shadow-md">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-600">
                              <BadgeCheck size={12} /> Genuine
                            </span>
                            <span className="font-mono text-[11px] text-muted">{cert.date ? formalDate(cert.date) : ''}</span>
                          </div>
                          <h3 className="mt-2 text-base font-bold text-fg line-clamp-1">{cert.event}</h3>
                          <p className="mt-1 font-mono text-xs text-muted">ID: {prettyCode(cert.code)}</p>
                        </div>

                        <div className="mt-4 flex items-center gap-2 pt-3 border-t border-line/60">
                          <Link to={`/verify/${cert.code}`} className="btn-outline !px-3 !py-1.5 text-[11px] inline-flex items-center gap-1.5 flex-1 justify-center">
                            <ExternalLink size={12} /> Verify
                          </Link>
                          <a href={`/api/event-registrations/certificate/${cert.code}`} target="_blank" rel="noopener noreferrer" className="btn-outline !px-3 !py-1.5 text-[11px] inline-flex items-center gap-1.5 flex-1 justify-center">
                            <Download size={12} /> PDF
                          </a>
                          <a href={linkedInUrl} target="_blank" rel="noopener noreferrer" title="Add to LinkedIn" className="rounded-xl border border-[#0A66C2]/40 bg-[#0A66C2]/10 p-2 text-[#0A66C2] hover:bg-[#0A66C2]/20 transition">
                            <Linkedin size={14} />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-line bg-alt/40 p-8 text-center">
                  <BookOpen className="mx-auto size-10 text-muted opacity-50 mb-2" />
                  <p className="text-sm font-medium text-fg2">No certificates published yet</p>
                  <p className="text-xs text-muted mt-1">Attend BAUET ICT Club workshops, hackathons, and contests to earn verifiable digital credentials.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
