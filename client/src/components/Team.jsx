import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Facebook, Github, Linkedin, Shield, Star, Crown, Award, Sparkles, ChevronRight } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import useStore from '../context/store';

const COMMITTEES = {
  'summer-26': {
    label: 'Summer 2026',
    tag: 'Current',
    president: 'Dr. Md. Rubel Bashar',
    vicePresidents: ['Mehedi Hasan Imran', 'Nasirul Mumenin', 'Mursheda Nusrat Della'],
    members: [
      { name: 'Naimur Islam Durjoy', position: 'General Secretary', dept: 'ICE', batch: '8th' },
      { name: 'Arin Jahan Akhi', position: 'Asst. General Secretary', dept: 'ICE', batch: '9th' },
      { name: 'Mubasshera Akter', position: 'Joint Secretary', dept: 'ICE', batch: '8th' },
      { name: 'Sadia Fahmida Sania', position: 'Joint Secretary', dept: 'ICE', batch: '9th' },
      { name: 'A. S. M. Eftekhar Ahmed Mitul', position: 'Organizing Secretary', dept: 'ICE', batch: '8th' },
      { name: 'Zannatul Ferdous', position: 'Treasurer', dept: 'ICE', batch: '8th' },
      { name: 'Tamanna Fazila Taki', position: 'Chief Executive (HR)', dept: 'ICE', batch: '9th' },
      { name: 'Md. Emamul Mursalin', position: 'Chief Executive (Logistics)', dept: 'ICE', batch: '9th' },
      { name: 'Sanzana Islam', position: 'Chief Executive (Development)', dept: 'ICE', batch: '8th' },
      { name: 'Gol-E-Zannat Keya', position: 'Chief Executive (Event Planning)', dept: 'ICE', batch: '9th' },
      { name: 'Jannatul Habiba', position: 'Chief Executive (Public Relations)', dept: 'ICE', batch: '9th' },
      { name: 'Nishat Aunjum Nury', position: 'Chief Executive (Cultural)', dept: 'ICE', batch: '11th' },
      { name: 'Noshin Anzum', position: 'Chief Executive (Media)', dept: 'ICE', batch: '9th' },
      { name: 'Khandakar Zarin Tasnia', position: 'Executive (Logistics)', dept: 'ICE', batch: '8th' },
      { name: 'Masum Billah', position: 'Executive (Development)', dept: 'ICE', batch: '11th' },
      { name: 'S.M Nabil', position: 'Executive (HR)', dept: 'ICE', batch: '9th' },
      { name: 'Saad Bin Ashad', position: 'Executive (Cultural)', dept: 'ICE', batch: '8th' },
      { name: 'Lubna Khanam', position: 'Executive (Event Planning)', dept: 'ICE', batch: '9th' },
      { name: 'Abdul Wahab Mridul', position: 'Executive (Media)', dept: 'ICE', batch: '9th' },
      { name: 'Shamim Ahmed', position: 'Executive (Public Relations)', dept: 'ICE', batch: '12th' },
      { name: 'Nafis Iqbal Kabir', position: 'Executive (Photography)', dept: 'LLB', batch: '14th' },
    ],
  },
  'winter-25': {
    label: 'Winter 2025',
    tag: 'Previous',
    president: 'Dr. Md. Rubel Bashar',
    vicePresidents: ['Mehedi Hasan Imran', 'Nasirul Mumenin', 'Mursheda Nusrat Della'],
    members: [
      { name: 'Naimur Islam Durjoy', position: 'General Secretary', dept: 'ICE', batch: '8th' },
      { name: 'Arin Jahan Akhi', position: 'Asst. General Secretary', dept: 'ICE', batch: '9th' },
      { name: 'Mubasshera Akter', position: 'Joint Secretary', dept: 'ICE', batch: '8th' },
      { name: 'Sadia Fahmida Sania', position: 'Joint Secretary', dept: 'ICE', batch: '9th' },
      { name: 'A. S. M. Eftekhar Ahmed Mitul', position: 'Organizing Secretary', dept: 'ICE', batch: '8th' },
      { name: 'Zannatul Ferdous', position: 'Treasurer', dept: 'ICE', batch: '8th' },
      { name: 'Tamanna Fazila Taki', position: 'Chief Executive (HR)', dept: 'ICE', batch: '9th' },
      { name: 'Md. Emamul Mursalin', position: 'Chief Executive (Logistics)', dept: 'ICE', batch: '9th' },
      { name: 'Sanzana Islam', position: 'Chief Executive (Development)', dept: 'ICE', batch: '8th' },
      { name: 'Gol-E-Zannat Keya', position: 'Chief Executive (Event Planning)', dept: 'ICE', batch: '9th' },
      { name: 'Jannatul Habiba', position: 'Chief Executive (Public Relations)', dept: 'ICE', batch: '9th' },
      { name: 'Nishat Aunjum Nury', position: 'Chief Executive (Cultural)', dept: 'ICE', batch: '11th' },
      { name: 'Noshin Anzum', position: 'Chief Executive (Media)', dept: 'ICE', batch: '9th' },
    ],
  },
  '2023-2024': {
    label: 'Session 2023-24',
    tag: 'Archive',
    president: 'Dr. Md. Rubel Bashar',
    vicePresidents: ['Mehedi Hasan Imran', 'Nasirul Mumenin'],
    members: [
      { name: 'Afsana Akter Kaniz', position: 'General Secretary', dept: 'ICE', batch: '6th' },
      { name: 'Md. Istaiq Ahmed', position: 'Asst. General Secretary', dept: 'ICE', batch: '7th' },
      { name: 'Rahela Islam Auntu', position: 'Joint Secretary', dept: 'ICE', batch: '6th' },
      { name: 'Sakib Haque Zisan', position: 'Joint Secretary', dept: 'CSE', batch: '8th' },
      { name: 'Masuda Sabatan Bristy', position: 'Organizing Secretary', dept: 'ICE', batch: '6th' },
      { name: 'Safat Rahman', position: 'Treasurer', dept: 'EEE', batch: '6th' },
      { name: 'Rabeya Khatun Rikta', position: 'Chief Executive (HR)', dept: 'ICE', batch: '7th' },
      { name: 'Soykot Azad Snigdho', position: 'Chief Executive (Logistics)', dept: 'ICE', batch: '6th' },
      { name: 'Tamanna Rafia', position: 'Chief Executive (Development)', dept: 'ICE', batch: '7th' },
      { name: 'Sanonda Sanyal', position: 'Chief Executive (Event Planning)', dept: 'ICE', batch: '6th' },
      { name: 'Humaira Rashid Koli', position: 'Chief Executive (Public Relations)', dept: 'ICE', batch: '7th' },
      { name: 'Md. Tahzib Uddin', position: 'Chief Executive (Cultural)', dept: 'ICE', batch: '6th' },
      { name: 'Anika Tahsin', position: 'Chief Executive (Media)', dept: 'ICE', batch: '6th' },
    ],
  },
  '2022-2023': {
    label: 'Session 2022-23',
    tag: 'Archive',
    president: 'Dr. Md. Rubel Bashar',
    vicePresidents: ['Mehedi Hasan Imran'],
    members: [
      { name: 'Md. Touhidul Islam', position: 'General Secretary', dept: 'ICE', batch: '5th' },
      { name: 'Nusrat Jahan Nishi', position: 'Asst. General Secretary', dept: 'ICE', batch: '6th' },
      { name: 'Ariful Islam', position: 'Joint Secretary', dept: 'ICE', batch: '5th' },
      { name: 'Md. Rakibul Hasan', position: 'Organizing Secretary', dept: 'ICE', batch: '5th' },
      { name: 'Fariha Tasnim', position: 'Treasurer', dept: 'ICE', batch: '6th' },
      { name: 'Sumaiya Akter', position: 'Chief Executive (HR)', dept: 'ICE', batch: '6th' },
      { name: 'Md. Hasanuzzaman', position: 'Chief Executive (Logistics)', dept: 'ICE', batch: '5th' },
      { name: 'Sabrina Akter', position: 'Chief Executive (Development)', dept: 'ICE', batch: '6th' },
      { name: 'Tanjina Akter', position: 'Chief Executive (Event Planning)', dept: 'ICE', batch: '5th' },
      { name: 'Md. Nazmul Haque', position: 'Chief Executive (Public Relations)', dept: 'ICE', batch: '6th' },
      { name: 'Farzana Yesmin', position: 'Chief Executive (Cultural)', dept: 'ICE', batch: '5th' },
      { name: 'Md. Imran Hossain', position: 'Chief Executive (Media)', dept: 'ICE', batch: '5th' },
    ],
  },
};

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

function getInitials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function getIcon(pos) {
  if (pos === 'General Secretary') return Crown;
  if (CORE_POSITIONS.includes(pos)) return Shield;
  if (pos.startsWith('Chief Executive')) return Star;
  return Award;
}

function MemberCard({ member, index, compact }) {
  const deptColor = DEPT_COLORS[member.dept] || '#94A3B8';
  const Icon = getIcon(member.position);
  const isCore = CORE_POSITIONS.includes(member.position);
  const dbMembers = useStore(s => s.members);
  const dbMatch = dbMembers.find(m => m.name?.toLowerCase() === member.name.toLowerCase());

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
          background: dbMatch?.image_url
            ? `url(${dbMatch.image_url}) center/cover no-repeat`
            : `linear-gradient(135deg, ${deptColor}18, ${deptColor}35)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `2.5px solid ${deptColor}30`,
          position: 'relative',
        }}>
          {!dbMatch?.image_url && (
            <span style={{ fontSize: compact ? 18 : 22, fontWeight: 700, color: deptColor, fontFamily: 'var(--font-display)' }}>
              {getInitials(member.name)}
            </span>
          )}
          {isCore && (
            <div style={{
              position: 'absolute', bottom: -3, right: -3,
              width: 24, height: 24, borderRadius: '50%',
              background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2.5px solid var(--bg-surface)', boxShadow: '0 2px 6px rgba(201,168,76,0.3)',
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
          <span style={{ opacity: 0.3 }}>·</span>
          <span>{member.batch} Batch</span>
        </div>

        {dbMatch && (dbMatch.social_fb || dbMatch.social_gh || dbMatch.social_li) && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
            {[
              [dbMatch.social_fb, Facebook],
              [dbMatch.social_li, Linkedin],
              [dbMatch.social_gh, Github],
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

export default function Team() {
  const [activeSession, setActiveSession] = useState('summer-26');
  const [filterDept, setFilterDept] = useState('all');
  const [ref, inView] = useInView({ threshold: 0.05, triggerOnce: true });

  const committee = COMMITTEES[activeSession];

  const allDepts = useMemo(() => {
    const s = new Set();
    committee.members.forEach(m => s.add(m.dept));
    return Array.from(s);
  }, [activeSession]);

  const filtered = useMemo(() => {
    let list = committee.members;
    if (filterDept !== 'all') list = list.filter(m => m.dept === filterDept);
    return list;
  }, [activeSession, filterDept]);

  const core = filtered.filter(m => CORE_POSITIONS.includes(m.position));
  const chiefs = filtered.filter(m => m.position.startsWith('Chief Executive'));
  const execs = filtered.filter(m => !CORE_POSITIONS.includes(m.position) && !m.position.startsWith('Chief Executive'));

  return (
    <section id="team" className="section" ref={ref} style={{ background: 'var(--bg)' }}>
      <style>{`
        .team-card:hover { box-shadow: 0 16px 48px rgba(0,0,0,0.1) !important; }
        .session-btn { position: relative; padding: 10px 20px; border-radius: 50px; font-size: 13px; font-weight: 600;
          border: 1px solid var(--border); background: var(--bg-surface); color: var(--fg-secondary); cursor: pointer;
          transition: all 0.3s ease; white-space: nowrap; }
        .session-btn.active { background: var(--accent); color: #fff; border-color: var(--accent); box-shadow: 0 4px 16px rgba(201,168,76,0.25); }
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
            <Sparkles size={13} /> Our People
          </div>
          <h2 className="section-title">Executive Committee</h2>
          <p className="section-desc">The dedicated team driving innovation at BAUET ICT Club</p>
          <div className="divider" />
        </motion.div>

        {/* Session Selector */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.15, duration: 0.5 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          {Object.entries(COMMITTEES).map(([key, val]) => (
            <button key={key} className={`session-btn${activeSession === key ? ' active' : ''}`}
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
          <motion.div key={activeSession + filterDept}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}>

            {/* President & VPs Banner */}
            <div style={{
              background: 'linear-gradient(135deg, var(--navy) 0%, #162544 50%, var(--navy) 100%)',
              borderRadius: 20, padding: '32px 24px 28px', marginBottom: 36,
              textAlign: 'center', border: '1px solid rgba(201,168,76,0.12)',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.04,
                backgroundImage: 'radial-gradient(circle at 20% 30%, var(--accent) 1px, transparent 1px), radial-gradient(circle at 80% 70%, var(--tech) 1px, transparent 1px)',
                backgroundSize: '60px 60px',
              }} />
              <div style={{ position: 'relative' }}>
                <div style={{ fontSize: 10, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 3, fontWeight: 700, marginBottom: 10 }}>
                  Advisor & Patron
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', fontFamily: 'var(--font-display)', marginBottom: 4 }}>
                  {committee.president}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 22, fontWeight: 600 }}>
                  President & Head of Dept. of ICE
                </div>
                <div className="vp-row" style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                  {committee.vicePresidents.map((vp, i) => (
                    <div key={i} style={{
                      padding: '10px 22px', background: 'rgba(255,255,255,0.05)', borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(4px)',
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{vp}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 }}>Vice President</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

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
