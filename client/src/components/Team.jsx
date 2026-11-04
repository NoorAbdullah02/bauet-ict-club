import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Facebook, Github, Linkedin, Shield, Star, Crown, Award, ChevronRight } from 'lucide-react';
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

const isLeader = (p) => /^(Vice )?President/i.test(p);
const isCore = (p) => CORE_POSITIONS.includes(p) || (/Secretary|Treasurer/.test(p) && !/^Executive/.test(p));

function getInitials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function getIcon(pos) {
  if (pos === 'General Secretary') return Crown;
  if (isCore(pos)) return Shield;
  if (pos.startsWith('Chief Executive')) return Star;
  return Award;
}

function Avatar({ person, size = 48, ring }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', margin: ring ? '0 auto' : 0, flexShrink: 0,
      background: person.image_url ? `url(${person.image_url}) center/cover no-repeat` : 'linear-gradient(135deg, var(--accent), var(--tech))',
      display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 700, fontSize: size * 0.36,
      fontFamily: 'var(--font-display)',
      boxShadow: ring ? '0 0 0 3px rgba(255,255,255,0.15), 0 0 40px rgba(var(--accent-rgb),0.5)' : 'none',
    }}>
      {!person.image_url && getInitials(person.name)}
    </div>
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
            ? `url(${member.image_url}) center/cover no-repeat`
            : `linear-gradient(135deg, ${deptColor}18, ${deptColor}35)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `2.5px solid ${deptColor}30`,
          position: 'relative',
        }}>
          {!member.image_url && (
            <span style={{ fontSize: compact ? 18 : 22, fontWeight: 700, color: deptColor, fontFamily: 'var(--font-display)' }}>
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

        <h4 style={{
          fontSize: compact ? 13 : 15, fontWeight: 700, color: 'var(--fg)',
          fontFamily: 'var(--font-display)', marginBottom: 5, lineHeight: 1.3,
        }}>
          {member.name}
        </h4>

        <div style={{
          fontSize: 11, fontWeight: 600, color: deptColor,
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

import { sessionRank, slug, isAmbassador } from '../lib/sessions';

function useSessions(dbMembers) {
  return useMemo(() => {
    const out = {};
    dbMembers.filter((m) => m.committee_session && m.active !== false && !isAmbassador(m.position)).forEach((m) => {
      const label = m.committee_session.trim();
      const key = slug(label);
      const c = (out[key] ||= { label, presidents: [], vps: [], members: [] });
      const person = { name: m.name, image_url: m.image_url, title: m.position };
      if (/^President/i.test(m.position)) c.presidents.push({ ...person, title: 'President' });
      else if (/^Vice President/i.test(m.position)) c.vps.push(person);
      else c.members.push({
        name: m.name, position: m.position, dept: m.department || 'ICE',
        batch: m.batch || '', image_url: m.image_url, _order: m.display_order,
        social_fb: m.social_fb, social_gh: m.social_gh, social_li: m.social_li,
      });
    });
    const keys = Object.keys(out).sort((a, b) => sessionRank(out[b].label) - sessionRank(out[a].label));
    return Object.fromEntries(keys.map((k, i) => [k, { ...out[k], tag: i === 0 ? 'Current' : 'Previous' }]));
  }, [dbMembers]);
}

export default function Team() {
  const dbMembersAll = useStore((s) => s.members);
  const sessions = useSessions(dbMembersAll);
  const [activeSession, setActiveSession] = useState(null);
  const sessionKey = activeSession && sessions[activeSession] ? activeSession : Object.keys(sessions)[0];
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
          <div className="section-tag">Our People</div>
          <h2 className="section-title">Executive Committee</h2>
          <p className="section-desc">Committee members will appear here once they are added from the admin panel.</p>
        </div>
      </section>
    );
  }

  return (
    <section id="team" className="section" ref={ref} style={{ background: 'var(--bg)' }}>
      <style>{`
        .team-card:hover { box-shadow: 0 16px 48px rgba(0,0,0,0.1) !important; }
        .session-btn { position: relative; padding: 10px 20px; border-radius: 50px; font-size: 13px; font-weight: 600;
          border: 1px solid var(--border); background: var(--bg-surface); color: var(--fg-secondary); cursor: pointer;
          transition: all 0.3s ease; white-space: nowrap; }
        .session-btn.active { background: var(--accent); color: #fff; border-color: var(--accent); box-shadow: 0 4px 16px rgba(var(--accent-rgb),0.25); }
        .session-btn:not(.active):hover { border-color: var(--accent); color: var(--accent); }
        .dept-chip { padding: 5px 14px; border-radius: 20px; font-size: 11px; font-weight: 600; cursor: pointer;
          transition: all 0.25s ease; border: 1px solid var(--border); background: transparent; color: var(--fg-muted); }
        .dept-chip.active { color: #fff; }
        .dept-chip:not(.active):hover { background: var(--bg-alt); }
        @media (max-width: 768px) {
          .team-grid-core { grid-template-columns: repeat(2, 1fr) !important; }
          .team-grid-chiefs { grid-template-columns: repeat(2, 1fr) !important; }
          .team-grid-execs { grid-template-columns: repeat(2, 1fr) !important; }
          .vp-row { flex-direction: column !important; }
        }
      `}</style>

      <div className="container">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: 44 }}>
          <div className="section-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            Our People
          </div>
          <h2 className="section-title">Executive Committee</h2>
          <p className="section-desc">The dedicated team driving innovation at BAUET ICT Club</p>
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
        <motion.div initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.25, duration: 0.5 }}
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
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div key={sessionKey + filterDept}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}>

            {/* President & VPs Banner */}
            {(committee.presidents.length > 0 || committee.vps.length > 0) && (
              <div style={{
                background: 'linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 50%, var(--navy) 100%)',
                borderRadius: 24, padding: '36px 24px 32px', marginBottom: 36,
                textAlign: 'center', border: '1px solid rgba(var(--accent-rgb),0.25)',
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 80% at 50% 0%, rgba(var(--accent-rgb),0.28), transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ position: 'relative' }}>
                  <div style={{ fontSize: 10, color: 'var(--tech)', textTransform: 'uppercase', letterSpacing: 3, fontWeight: 700, marginBottom: 18 }}>
                    Leadership
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 28, flexWrap: 'wrap', marginBottom: committee.vps.length ? 26 : 0 }}>
                    {committee.presidents.map((p) => (
                      <div key={p.name}>
                        <Avatar person={p} size={92} ring />
                        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)', marginTop: 12, marginBottom: 4 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600 }}>{p.title}</div>
                      </div>
                    ))}
                  </div>
                  <div className="vp-row" style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                    {committee.vps.map((vp) => (
                      <div key={vp.name} style={{
                        padding: '10px 22px 10px 12px', background: 'rgba(255,255,255,0.06)', borderRadius: 999,
                        border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(6px)',
                        display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                      }}>
                        <Avatar person={vp} size={40} />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{vp.name}</div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 1, textTransform: 'uppercase', letterSpacing: 1 }}>{vp.title || 'Vice President'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Core Executives */}
            {core.length > 0 && (
              <div style={{ marginBottom: 36 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 18 }}>
                  <div style={{ height: 1, width: 40, background: 'var(--accent)', opacity: 0.3 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 2 }}>Core Executives</span>
                  <div style={{ height: 1, width: 40, background: 'var(--accent)', opacity: 0.3 }} />
                </div>
                <div className="team-grid-core" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
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
                <div className="team-grid-chiefs" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14 }}>
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
                <div className="team-grid-execs" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
                  {execs.map((m, i) => <MemberCard key={m.name + m.position} member={m} index={i} compact />)}
                </div>
              </div>
            )}

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--fg-muted)' }}>
                <Users size={36} strokeWidth={1} style={{ marginBottom: 10, opacity: 0.3 }} />
                <p style={{ fontSize: 14 }}>No members found for this filter.</p>
              </div>
            )}

            {/* Stats Footer */}
            <div style={{
              textAlign: 'center', padding: '18px 20px', borderRadius: 14,
              background: 'var(--bg-alt)', border: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 28, flexWrap: 'wrap' }}>
                {allDepts.map(d => (
                  <div key={d}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: DEPT_COLORS[d], fontFamily: 'var(--font-mono)' }}>
                      {committee.members.filter(m => m.dept === d).length}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--fg-muted)' }} title={DEPT_FULL[d]}>{d}</div>
                  </div>
                ))}
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{committee.members.length}</div>
                  <div style={{ fontSize: 10, color: 'var(--fg-muted)' }}>Total</div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
