import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BadgeCheck, Loader2, Award, Calendar, Share2, Copy, Check, 
  Linkedin, Github, Facebook, Download, ExternalLink, Sparkles, 
  CreditCard, Shield, Flame, BookOpen
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../context/store';
import { formalDate } from '../lib/format';
import { prettyCode } from '../lib/qr';
import { thumb } from '../lib/img';
import { copyText } from '../lib/share';

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
                <div className="relative size-32 sm:size-36 shrink-0 rounded-3xl border-4 border-surface bg-bg shadow-2xl overflow-hidden ring-4 ring-accent/20">
                  {m.image_url ? (
                    <img src={thumb(m.image_url, 400)} alt={m.name} className="size-full object-cover object-top" />
                  ) : (
                    <div className="grid size-full place-items-center bg-gradient-to-br from-accent/20 to-accent/5 font-display text-4xl font-bold text-accent">
                      {m.name.charAt(0)}
                    </div>
                  )}
                  {data.verified && (
                    <span title="Verified Member" className="absolute bottom-2 right-2 flex size-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
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
