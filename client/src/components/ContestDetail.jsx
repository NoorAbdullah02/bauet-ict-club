import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Calendar, CheckCircle2, Loader2, MapPin, Medal, Plus, Trophy, Users, X } from 'lucide-react';
import useStore, { api } from '../context/store';
import { formalDate } from '../lib/format';
import { cn } from '../lib/cn';
import { statusLabel } from './Contests';
import { ProblemPage } from '../pages/NotFound';

const inp = 'w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-fg outline-none transition focus:border-tech';
const blank = () => ({ name: '', email: '', student_id: '' });

/** One contest: details, results, and the team sign-up form. */
export default function ContestDetail() {
  const { id } = useParams();
  const [c, setC] = useState(null);
  const [info, setInfo] = useState(null);
  const [f, setF] = useState({ team_name: '', leader_name: '', email: '', phone: '', members: [blank()], _hp: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  useEffect(() => {
    let on = true;
    api.get(`/contests/${id}`).then((r) => { if (on) { setC(r.data); document.title = `${r.data.title} | BAUET ICT Club`; } }).catch(() => on && setC(false));
    api.get(`/contest-teams/public/${id}`).then((r) => on && setInfo(r.data)).catch(() => {});
    return () => { on = false; };
  }, [id]);
  useEffect(() => { useStore.getState().fetchList?.('contests'); }, []);
  if (c === null) return <section className="section"><div className="container max-w-3xl"><div className="h-72 animate-pulse rounded-3xl bg-alt" /></div></section>;
  if (c === false) return <ProblemPage title="This contest does not exist" message="It may have been removed, or the link is wrong. See all contests instead." />;

  const st = statusLabel(c);
  const open = info ? info.open : st === 'open';
  const max = c.team_max || 4, min = c.team_min || 1;
  const setM = (i, k, v) => setF((p) => ({ ...p, members: p.members.map((m, j) => (j === i ? { ...m, [k]: v } : m)) }));
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { const r = await api.post(`/contest-teams/${id}`, f); setDone(r.data); api.get(`/contest-teams/public/${id}`).then((x) => setInfo(x.data)).catch(() => {}); }
    catch (ex) { toast.error(ex.response?.data?.error || 'Could not sign up. Please try again.'); }
    setBusy(false);
  };

  return (
    <section className="section">
      <div className="container max-w-3xl">
        <Link to="/contests" className="mb-5 inline-flex items-center gap-1.5 text-sm text-fg2 hover:text-accent"><ArrowLeft size={15} /> All contests</Link>
        {c.image_url && <img src={c.image_url} alt="" decoding="async" className="mb-6 h-56 w-full rounded-3xl object-cover" />}
        <h1 className="text-[clamp(2rem,5vw,3rem)] leading-tight text-fg">{c.title}</h1>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-fg2">
          {c.start_date && <span className="flex items-center gap-2"><Calendar size={15} className="text-accent" /> {formalDate(c.start_date)}</span>}
          {c.location && <span className="flex items-center gap-2"><MapPin size={15} className="text-accent" /> {c.location}</span>}
          <span className="flex items-center gap-2"><Users size={15} className="text-accent" /> Teams of {min === max ? max : `${min} to ${max}`}{info ? ` · ${info.teams} ${info.teams === 1 ? 'team' : 'teams'} joined` : ''}</span>
        </div>
        {c.description && <p className="mt-5 whitespace-pre-line text-fg2">{c.description}</p>}
        {c.prize && <div className="mt-5 flex items-start gap-3 rounded-2xl border border-line bg-surface p-4"><Trophy size={20} className="mt-0.5 shrink-0 text-amber-500" /><div><div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Prizes</div><div className="text-fg">{c.prize}</div></div></div>}
        {c.rules && <div className="mt-5"><h2 className="mb-2 text-xl text-fg">Rules</h2><ul className="list-disc space-y-1 pl-5 text-sm text-fg2">{String(c.rules).split('\n').filter(Boolean).map((r, i) => <li key={i}>{r}</li>)}</ul></div>}

        {info?.results?.length > 0 && (
          <div className="mt-8"><h2 className="mb-3 text-2xl text-fg">Results</h2>
            <ol className="space-y-2">{info.results.map((t) => (
              <li key={t.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4"><span className={cn('grid size-9 place-items-center rounded-full font-display', t.rank <= 3 ? 'bg-amber-400/90 text-amber-950' : 'bg-alt text-fg2')}>{t.rank <= 3 ? <Medal size={17} /> : t.rank}</span>
                <div className="min-w-0 flex-1"><div className="truncate font-semibold text-fg">#{t.rank} · {t.team_name}</div>{t.prize_note && <div className="text-xs text-fg2">{t.prize_note}</div>}</div></li>
            ))}</ol>
          </div>
        )}

        <div className="mt-10 rounded-3xl border border-line bg-surface p-6 shadow-sm">
          <h2 className="text-2xl text-fg">Sign your team up</h2>
          {done ? (
            <div className="py-6 text-center"><CheckCircle2 size={44} className="mx-auto text-emerald-500" /><h3 className="mt-3 text-xl text-fg">You are in, {done.team_name}!</h3><p className="mt-1 text-sm text-fg2">Your team of {done.size} is signed up. We will contact the team leader by e-mail.</p></div>
          ) : !open ? (
            <p className="mt-3 text-fg2">{st === 'finished' ? 'This contest is over.' : 'Sign-up for this contest is closed.'}</p>
          ) : (
            <form onSubmit={submit} className="mt-4 space-y-3">
              <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={f._hp} onChange={(e) => setF({ ...f, _hp: e.target.value })} />
              <input className={inp} placeholder="Team name *" aria-label="Team name" maxLength={80} required value={f.team_name} onChange={(e) => setF({ ...f, team_name: e.target.value })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <input className={inp} placeholder="Team leader's name *" aria-label="Leader's name" required maxLength={120} value={f.leader_name} onChange={(e) => setF({ ...f, leader_name: e.target.value })} />
                <input className={inp} type="email" placeholder="Leader's e-mail *" aria-label="Leader's e-mail" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
              </div>
              <input className={inp} type="tel" placeholder="Leader's phone (optional)" aria-label="Phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
              <div className="pt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">Other members ({1 + f.members.length} of {max} people)</div>
              {f.members.map((m, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_8rem_auto]">
                  <input className={inp} placeholder="Name" aria-label={`Member ${i + 1} name`} value={m.name} onChange={(e) => setM(i, 'name', e.target.value)} />
                  <input className={inp} type="email" placeholder="E-mail (for points)" aria-label={`Member ${i + 1} e-mail`} value={m.email} onChange={(e) => setM(i, 'email', e.target.value)} />
                  <input className={inp} placeholder="Student ID" aria-label={`Member ${i + 1} student ID`} value={m.student_id} onChange={(e) => setM(i, 'student_id', e.target.value)} />
                  <button type="button" onClick={() => setF((p) => ({ ...p, members: p.members.filter((_, j) => j !== i) }))} aria-label="Remove member" className="grid size-10 place-items-center rounded-xl text-fg2 hover:bg-red-500/10 hover:text-red-500"><X size={16} /></button>
                </div>
              ))}
              {1 + f.members.length < max && <button type="button" onClick={() => setF((p) => ({ ...p, members: [...p.members, blank()] }))} className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent"><Plus size={15} /> Add a member</button>}
              <button disabled={busy} className="btn-primary w-full justify-center">{busy ? <Loader2 size={16} className="animate-spin" /> : null} Sign up</button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
