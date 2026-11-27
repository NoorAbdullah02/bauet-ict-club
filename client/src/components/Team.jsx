import { useState, useMemo, useEffect } from 'react';
import { thumb, portrait } from '../lib/img';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Users, Facebook, Github, Linkedin, Shield, Star, Crown, Award, ChevronRight, IdCard, GraduationCap, Mail } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import useStore from '../context/store';

const DEPT_FULL = {
  ICE: 'Information & Communication Engineering',
  CSE: 'Computer Science & Engineering',
  EEE: 'Electrical & Electronic Engineering',
  CE: 'Civil Engineering',
  ME: 'Mechanical Engineering',
  BBA: 'Bachelor of Business Administration',
  LLB: 'Bachelor of Laws',
  ELL: 'English Language & Literature',
};

const DEPT_COLORS = {
  ICE: '#0096C7', CSE: '#8B5CF6', EEE: '#F59E0B', CE: '#EF4444',
  ME: '#10B981', BBA: '#EC4899', LLB: '#6366F1', ELL: '#14B8A6',
};

const CORE_POSITIONS = ['General Secretary', 'Asst. General Secretary', 'Joint Secretary', 'Organizing Secretary', 'Treasurer'];

const isLeader = (p) => /^((Vice President|VP)\b|President)/i.test(p);
const isCore = (p) => CORE_POSITIONS.includes(p) || (/Secretary|Treasurer/.test(p) && !/^Executive/.test(p));

function getInitials(name = '') {
  // Skip titles so "Ms. Nusrat Jahan" reads "NJ", the same rule the app uses.
  const words = name.split(/\s+/).filter(Boolean);
  const names = words.filter(w => !/^(mr|mrs|ms|dr|prof|md|engr)\.?$/i.test(w));
  return (names.length ? names : words).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function getIcon(pos) {
  if (pos === 'General Secretary') return Crown;
  if (isCore(pos)) return Shield;
  if (pos.startsWith('Chief Executive')) return Star;
  return Award;
}

/** A round portrait. The picture is kept sharp (2-3x the drawn size) and framed a little above the middle, so a tall photo does not show only a chin.
 *  If the picture cannot be loaded the initials take its place instead of an empty circle. */
function Avatar({ person, size = 48, ring }) {
  const [failed, setFailed] = useState(false);
  const src = person.image_url ? portrait(person.image_url, Math.round(size * 2.5)) : '';
  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      width: size, height: size, borderRadius: '50%', margin: ring ? '0 auto' : 0, flexShrink: 0,
      background: 'linear-gradient(135deg, var(--accent), var(--tech))',
      display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 700, fontSize: size * 0.36,
      fontFamily: 'var(--font-display)',
      boxShadow: ring ? '0 0 0 3px rgba(255,255,255,0.15), 0 0 40px rgba(var(--accent-rgb),0.5)' : 'none',
    }}>
      {src && !failed
        ? <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)}
            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%' }} />
        : getInitials(person.name)}
    </div>
  );
}

/** The club's advisors (teachers who guide the club), shown above the committee. */
function AdvisorsPanel({ advisors }) {
  const settings = useStore((s) => s.settings);
  const list = (advisors || []).filter((a) => a.active !== false);
  if (!list.length) return null;
  const chief = list.find((a) => /chief/i.test(a.designation || ''));
  const others = list.filter((a) => a !== chief);
  const card = (a, i, big) => (
    <motion.article key={a.id} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: Math.min(i * 0.06, 0.3) }}
      style={{ position: 'relative', width: big ? 'min(100%, 380px)' : 'min(100%, 280px)', background: 'var(--bg-surface)', border: big ? '1px solid rgba(var(--accent-rgb),0.45)' : '1px solid var(--border)', borderRadius: 24, overflow: 'hidden', textAlign: 'center', boxShadow: big ? 'var(--shadow-lg)' : 'var(--shadow-md)' }}>
      <div style={{ height: big ? 6 : 4, background: 'linear-gradient(90deg,#35D989,#38C8F0,#8B5CF6,#FF6B8A)' }} />
      <div style={{ padding: big ? '30px 22px 24px' : '22px 16px 18px' }}>
        <div style={{ padding: 4, width: big ? 164 : 112, height: big ? 164 : 112, margin: '0 auto', borderRadius: '50%', background: 'linear-gradient(135deg,#35D989,#38C8F0,#8B5CF6)', boxShadow: '0 10px 26px rgba(56,200,240,0.28)' }}>
          <Avatar person={a} size={big ? 156 : 104} />
        </div>
        <span className="badge badge-tech" style={{ display: 'inline-block', marginTop: 14 }}>{a.designation || 'Advisor'}</span>
        <h3 style={{ fontSize: big ? 24 : 18, marginTop: 8, color: 'var(--fg)', lineHeight: 1.2 }}>{a.name}</h3>
        {a.rank_title && <p style={{ fontSize: big ? 14 : 13, color: 'var(--fg2)', marginTop: 4 }}>{a.rank_title}</p>}
        {a.department && <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>{a.department}</p>}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
          {a.email && <a href={`mailto:${a.email}`} aria-label={`E-mail ${a.name}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--fg2)' }}><Mail size={13} /> E-mail</a>}
          <Link to={`/card/a${a.id}`} title="Digital membership card" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--tech)' }}><IdCard size={13} /> Card</Link>
        </div>
      </div>
    </motion.article>
  );
  return (
    <section aria-label="Advisors" style={{ marginBottom: 40 }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--tech)', textTransform: 'uppercase', letterSpacing: 3, fontWeight: 700 }}><GraduationCap size={15} /> {settings?.teamAdvisorsTag || 'Our advisors'}</span>
        <h2 style={{ fontSize: 'clamp(1.5rem,3vw,2.1rem)', marginTop: 6, color: 'var(--fg)' }}>{settings?.teamAdvisors || 'Guided by experience'}</h2>
      </div>
      {chief && <div style={{ display: 'flex', justifyContent: 'center', marginBottom: others.length ? 18 : 0 }}>{card(chief, 0, true)}</div>}
      {others.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 18 }}>{others.map((a, i) => card(a, i + 1, false))}</div>}
    </section>
  );
}

function MemberCard({ member, index, compact }) {
  const deptColor = DEPT_COLORS[member.dept] || '#94A3B8';
  const Icon = getIcon(member.position);
  const isCoreMember = isCore(member.position);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.04, 0.35), ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -6, transition: { duration: 0.25 } }}
      style={{
        position: 'relative',
        background: 'var(--bg-surface)',
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid var(--border)',
        transition: 'box-shadow 0.35s ease',
        cursor: 'default',
      }}
      className="team-card"
    >
      <div style={{ height: 3, background: `linear-gradient(90deg, ${deptColor}, var(--accent))` }} />
      <div style={{ padding: compact ? '20px 16px 18px' : '24px 20px 22px', textAlign: 'center' }}>
        <div style={{
          width: compact ? 64 : 76, height: compact ? 64 : 76, borderRadius: '50%',
          margin: '0 auto 14px',
          background: (member.image_url)
            ? `url(${thumb(member.image_url, 420)}) center/cover no-repeat`
            : `linear-gradient(135deg, ${deptColor}18, ${deptColor}35)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `2.5px solid ${deptColor}30`,
          position: 'relative',
        }}>
          {!member.image_url && (
            <span style={{ fontSize: compact ? 18 : 22, fontWeight: 700, color: `color-mix(in srgb, ${deptColor} 60%, var(--fg))`, fontFamily: 'var(--font-display)' }}>
              {getInitials(member.name)}
            </span>
          )}
          {isCoreMember && (
            <div style={{
              position: 'absolute', bottom: -3, right: -3,
              width: 24, height: 24, borderRadius: '50%',
              background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2.5px solid var(--bg-surface)', boxShadow: '0 2px 6px rgba(var(--accent-rgb),0.3)',
            }}>
              <Icon size={11} color="#fff" />
            </div>
          )}
        </div>

        <h3 style={{
          fontSize: compact ? 13 : 15, fontWeight: 700, color: 'var(--fg)',
          fontFamily: 'var(--font-display)', marginBottom: 5, lineHeight: 1.3,
        }}>
          {member.name}
        </h3>

        <div style={{
          fontSize: 11, fontWeight: 600, color: `color-mix(in srgb, ${deptColor} 55%, var(--fg))`, // the department colour stays on the tint and border; the text is mixed toward the page text colour so it is readable
          padding: '3px 10px', borderRadius: 16,
          background: `${deptColor}0D`, border: `1px solid ${deptColor}1A`,
          display: 'inline-block', marginBottom: 6, letterSpacing: 0.2,
        }}>
          {member.position}
        </div>

        <div style={{ fontSize: 11, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: deptColor, flexShrink: 0 }} />
          <span title={DEPT_FULL[member.dept]}>{member.dept}</span>
          {member.batch && <><span style={{ opacity: 0.3 }}>·</span><span>{member.batch} Batch</span></>}
        </div>

        {member?.id && !compact && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
            <Link to={`/card/${member.id}`} title="Digital membership card" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: 'var(--tech)' }}><IdCard size={13} /> Member card</Link>
          </div>
        )}

        {member && (member.social_fb || member.social_gh || member.social_li) && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
            {[
              [member.social_fb, Facebook],
              [member.social_li, Linkedin],
              [member.social_gh, Github],
            ].filter(([url]) => url).map(([url, SIcon], j) => (
              <a key={j} href={url} target="_blank" rel="noopener noreferrer"
                style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-muted)', transition: 'color 0.2s' }}>
                <SIcon size={12} />
              </a>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

import { sessionRank, slug, isAmbassador, vpRank } from '../lib/sessions';

function useSessions(dbMembers, currentSessionLabel) {
  return useMemo(() => {
    const out = {};
    dbMembers.filter((m) => m.committee_session && m.active !== false && !isAmbassador(m.position)).forEach((m) => {
      const label = m.committee_session.trim();
      const key = slug(label);
      const c = (out[key] ||= { label, presidents: [], vps: [], members: [] });
      const person = { name: m.name, image_url: m.image_url, title: m.position };
      if (/^President/i.test(m.position)) c.presidents.push({ ...person, title: 'President' });
      else if (/^(Vice President|VP)\b/i.test(m.position)) c.vps.push(person);
      else c.members.push({
        name: m.name, position: m.position, dept: m.department || 'ICE',
        batch: m.batch || '', image_url: m.image_url, _order: m.display_order,
        social_fb: m.social_fb, social_gh: m.social_gh, social_li: m.social_li,
      });
    });
    Object.values(out).forEach((c) => c.vps.sort((a, b) => vpRank(a.title) - vpRank(b.title)));
    const keys = Object.keys(out).sort((a, b) => {
      if (currentSessionLabel) {
        if (out[a].label.toLowerCase() === currentSessionLabel.toLowerCase()) return -1;
        if (out[b].label.toLowerCase() === currentSessionLabel.toLowerCase()) return 1;
      }
      return sessionRank(out[b].label) - sessionRank(out[a].label);
    });
    return Object.fromEntries(keys.map((k, i) => {
      const isCur = currentSessionLabel
        ? out[k].label.toLowerCase() === currentSessionLabel.toLowerCase()
        : i === 0;
      return [k, { ...out[k], tag: isCur ? 'Current' : 'Previous' }];
    }));
  }, [dbMembers, currentSessionLabel]);
}

export default function Team() {
  const settings = useStore((s) => s.settings);
  const advisors = useStore((s) => s.advisors);
  const dbMembersAll = useStore((s) => s.members);
  const storeSessions = useStore((s) => s.sessions);
  const fetchSessions = useStore((s) => s.fetchSessions);
  const fetchMembers = useStore((s) => s.fetchList);

  useEffect(() => {
    if (!storeSessions || storeSessions.length === 0) {
      fetchSessions().catch(() => {});
    }
  }, [storeSessions, fetchSessions]);

  // an admin may have changed a photo or a post since the page was first opened: revalidate on every visit
  useEffect(() => { fetchMembers('members').catch(() => {}); }, [fetchMembers]);

  const currentSessionLabel = useMemo(() => {
    const cur = (storeSessions || []).find((s) => s.is_current);
    return cur?.label || null;
  }, [storeSessions]);

  const sessions = useSessions(dbMembersAll, currentSessionLabel);
  const [activeSession, setActiveSession] = useState(null);

  const defaultKey = useMemo(() => {
    if (currentSessionLabel) {
      const found = Object.entries(sessions).find(([, val]) => val.label.toLowerCase() === currentSessionLabel.toLowerCase());
      if (found) return found[0];
    }
    return Object.keys(sessions)[0];
  }, [sessions, currentSessionLabel]);

  const sessionKey = activeSession && sessions[activeSession] ? activeSession : defaultKey;
  const [filterDept, setFilterDept] = useState('all');
  const [ref, inView] = useInView({ threshold: 0.05, triggerOnce: true });

  const committee = sessions[sessionKey];
  const allDepts = useMemo(() => {
    const s = new Set();
    (committee?.members || []).forEach(m => s.add(m.dept));
    return Array.from(s);
  }, [sessionKey, committee]);

  const filtered = useMemo(() => {
    let list = committee?.members || [];
    if (filterDept !== 'all') list = list.filter(m => m.dept === filterDept);
    return list;
  }, [sessionKey, filterDept, committee]);

  const byOrder = (a, b) => (a._order ?? 99) - (b._order ?? 99);
  const core = filtered.filter(m => isCore(m.position)).sort(byOrder);
  const chiefs = filtered.filter(m => m.position.startsWith('Chief Executive'));
  const execs = filtered.filter(m => !isCore(m.position) && !m.position.startsWith('Chief Executive')).sort(byOrder);

  if (!committee) {
    return (
      <section id="team" className="section">
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="section-tag">{settings?.teamTag || 'Our People'}</div>
          <h2 className="section-title">{settings?.teamTitle || 'Executive Committee'}</h2>
          <p className="section-desc">{settings?.teamDesc || 'The executive committee will be announced here soon.'}</p>
        </div>
      </section>
    );
  }

  // how many people this committee really has: a lone president must not look like an empty page
  const totalPeople = committee.presidents.length + committee.vps.length + core.length + chiefs.length + execs.length;
  const soloLeader = committee.presidents.length > 0 && committee.vps.length === 0;

  return (
    <section id="team" className="section" ref={ref} style={{ background: 'var(--bg)' }}>
      <style>{`
        .team-card:hover { box-shadow: 0 16px 48px rgba(0,0,0,0.1) !important; }
        .session-btn { position: relative; padding: 10px 20px; border-radius: 50px; font-size: 13px; font-weight: 600;
          border: 1px solid var(--border); background: var(--bg-surface); color: var(--fg-secondary); cursor: pointer;
          transition: all 0.3s ease; white-space: nowrap; }
        .session-btn.active { background: var(--accent); color: var(--on-accent); border-color: var(--accent); box-shadow: 0 4px 16px rgba(var(--accent-rgb),0.25); }
        .session-btn:not(.active):hover { border-color: var(--accent); color: var(--accent); }
        .dept-chip { padding: 5px 14px; border-radius: 20px; font-size: 11px; font-weight: 600; cursor: pointer;
          transition: all 0.25s ease; border: 1px solid var(--border); background: transparent; color: var(--fg-muted); }
        .dept-chip.active { color: #fff; }
        .dept-chip:not(.active):hover { background: var(--bg-alt); }
        .lead-link { width: 1px; height: 26px; margin: 0 auto; background: linear-gradient(var(--tech), transparent); opacity: 0.7; }
        .vp-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; margin-top: 4px; }
        .vp-card { flex: 1 1 220px; max-width: 280px; min-width: 0; padding: 22px 18px 20px; border-radius: 20px; text-align: center;
          background: linear-gradient(160deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04));
          border: 1px solid rgba(255,255,255,0.16); backdrop-filter: blur(8px);
          transition: transform 0.4s var(--ease), border-color 0.3s, box-shadow 0.4s; }
        .vp-card:hover { transform: translateY(-5px); border-color: rgba(var(--tech-rgb),0.7); box-shadow: 0 18px 44px rgba(0,0,0,0.35), 0 0 30px rgba(var(--tech-rgb),0.2); }
        .vp-name { margin-top: 12px; font-size: 17px; font-weight: 700; color: #fff; font-family: var(--font-display); line-height: 1.25; }
        .vp-role { display: inline-block; margin-top: 8px; max-width: 100%; padding: 5px 12px; border-radius: 10px; font-size: 11px; font-weight: 700;
          letter-spacing: 0.3px; line-height: 1.35; color: #fff; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.22); }
      `}</style>

      <div className="container">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: 44 }}>
          <div className="section-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {settings?.teamTag || 'Our People'}
          </div>
          <h2 className="section-title">{settings?.teamTitle || 'Executive Committee'}</h2>
          <p className="section-desc">{settings?.teamDesc || 'The dedicated team driving innovation at BAUET ICT Club'}</p>
          <div className="divider" />
        </motion.div>

        {/* Session Selector */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.15, duration: 0.5 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          {Object.entries(sessions).map(([key, val]) => (
            <button key={key} className={`session-btn${sessionKey === key ? ' active' : ''}`}
              onClick={() => { setActiveSession(key); setFilterDept('all'); }}>
              {val.label}
              {val.tag === 'Current' && (
                <span style={{ marginLeft: 6, fontSize: 9, background: 'rgba(255,255,255,0.2)', padding: '2px 7px', borderRadius: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Active</span>
              )}
            </button>
          ))}
        </motion.div>

        {/* Department Filter */}
        {allDepts.length > 1 && <motion.div initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.25, duration: 0.5 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 36, flexWrap: 'wrap' }}>
          <button className={`dept-chip${filterDept === 'all' ? ' active' : ''}`}
            style={filterDept === 'all' ? { background: 'var(--navy)', borderColor: 'var(--navy)', color: '#fff' } : {}}
            onClick={() => setFilterDept('all')}>All Depts</button>
          {allDepts.map(d => (
            <button key={d} className={`dept-chip${filterDept === d ? ' active' : ''}`}
              title={DEPT_FULL[d]}
              style={filterDept === d ? { background: DEPT_COLORS[d], borderColor: DEPT_COLORS[d], color: '#fff' } : {}}
              onClick={() => setFilterDept(d)}>{d}</button>
          ))}
        </motion.div>}

        <AdvisorsPanel advisors={advisors} />

        <AnimatePresence mode="wait">
          <motion.div key={sessionKey + filterDept}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}>

            {/* President & VPs Banner */}
            {(committee.presidents.length > 0 || committee.vps.length > 0) && (
              <div style={{
                background: 'linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 50%, var(--navy) 100%)',
                borderRadius: 24, padding: soloLeader ? '30px 24px 28px' : '36px 24px 32px',
                margin: '0 auto 36px', maxWidth: soloLeader ? 620 : 1040,
                textAlign: 'center', border: '1px solid rgba(var(--accent-rgb),0.25)',
                position: 'relative', overflow: 'hidden',
                boxShadow: '0 22px 60px rgba(15,23,60,0.18)',
              }}>
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 80% at 50% 0%, rgba(var(--accent-rgb),0.28), transparent 70%)', pointerEvents: 'none' }} />
                {/* soft rings so a one-person banner still feels designed, not half-empty */}
                <div style={{ position: 'absolute', width: 420, height: 420, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.07)', top: -170, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', width: 620, height: 620, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.05)', top: -270, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }} />
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 22 }}>
                    <span style={{ height: 1, width: 44, background: 'rgba(255,255,255,0.22)' }} />
                    <span style={{ fontSize: 11.5, color: 'var(--tech)', textTransform: 'uppercase', letterSpacing: 3, fontWeight: 700 }}>Leadership</span>
                    <span style={{ height: 1, width: 44, background: 'rgba(255,255,255,0.22)' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 28, flexWrap: 'wrap', marginBottom: committee.vps.length ? 26 : 0 }}>
                    {committee.presidents.map((p) => (
                      <div key={p.name}>
                        <Avatar person={p} size={100} ring />
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)', marginTop: 14 }}>{p.name}</div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', marginTop: 8, padding: '5px 14px', borderRadius: 999, background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.28)', fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: '#fff' }}>{p.title}</div>
                      </div>
                    ))}
                  </div>
                  {committee.vps.length > 0 && committee.presidents.length > 0 && <div className="lead-link" />}
                  <div className="vp-row">
                    {committee.vps.map((vp) => (
                      <div key={vp.name + vp.title} className="vp-card">
                        <Avatar person={vp} size={68} ring />
                        <div className="vp-name">{vp.name}</div>
                        <div className="vp-role">{vp.title || 'Vice President'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* a brand-new committee: say so instead of leaving a bare page */}
            {totalPeople === 1 && (
              <p style={{ textAlign: 'center', margin: '-14px auto 34px', maxWidth: 460, color: 'var(--fg-muted)', fontSize: 13.5, lineHeight: 1.6 }}>
                This committee is just getting started — the rest of the team appears here as soon as they are added.
              </p>
            )}

            {/* Core Executives */}
            {core.length > 0 && (
              <div style={{ marginBottom: 36 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 18 }}>
                  <div style={{ height: 1, width: 40, background: 'var(--accent)', opacity: 0.3 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 2 }}>Core Executives</span>
                  <div style={{ height: 1, width: 40, background: 'var(--accent)', opacity: 0.3 }} />
                </div>
                <div className="team-flex team-flex-lg">
                  {core.map((m, i) => <MemberCard key={m.name + m.position} member={m} index={i} />)}
                </div>
              </div>
            )}

            {/* Chief Executives */}
            {chiefs.length > 0 && (
              <div style={{ marginBottom: 36 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 18 }}>
                  <div style={{ height: 1, width: 40, background: 'var(--tech)', opacity: 0.3 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tech)', textTransform: 'uppercase', letterSpacing: 2 }}>Chief Executives</span>
                  <div style={{ height: 1, width: 40, background: 'var(--tech)', opacity: 0.3 }} />
                </div>
                <div className="team-flex">
                  {chiefs.map((m, i) => <MemberCard key={m.name + m.position} member={m} index={i} compact />)}
                </div>
              </div>
            )}

            {/* Other Executives */}
            {execs.length > 0 && (
              <div style={{ marginBottom: 36 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 18 }}>
                  <div style={{ height: 1, width: 40, background: 'var(--fg-muted)', opacity: 0.2 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 2 }}>Executives</span>
                  <div style={{ height: 1, width: 40, background: 'var(--fg-muted)', opacity: 0.2 }} />
                </div>
                <div className="team-flex">
                  {execs.map((m, i) => <MemberCard key={m.name + m.position} member={m} index={i} compact />)}
                </div>
              </div>
            )}

            {totalPeople === 0 && (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--fg-muted)' }}>
                <Users size={36} strokeWidth={1} style={{ marginBottom: 10, opacity: 0.3 }} />
                <p style={{ fontSize: 14 }}>No members found for this filter.</p>
              </div>
            )}

            {/* Stats Footer */}
            {totalPeople > 1 && (<div style={{
              textAlign: 'center', padding: '18px 20px', borderRadius: 14,
              background: 'var(--bg-alt)', border: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 28, flexWrap: 'wrap' }}>
                {/* only departments that actually have someone: an empty committee should not show a row of zeros */}
                {allDepts.map((d) => {
                  const n = committee.members.filter(m => m.dept === d).length;
                  if (!n) return null;
                  return (
                    <div key={d}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: DEPT_COLORS[d], fontFamily: 'var(--font-mono)' }}>{n}</div>
                      <div style={{ fontSize: 10, color: 'var(--fg-muted)' }} title={DEPT_FULL[d]}>{d}</div>
                    </div>
                  );
                })}
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{totalPeople}</div>
                  <div style={{ fontSize: 10, color: 'var(--fg-muted)' }}>{totalPeople === 1 ? 'Member' : 'Total'}</div>
                </div>
              </div>
            </div>)}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
