import { useEffect, useState } from 'react';
import { Award, Check, Loader2, Pencil, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../context/store';
import { Panel, PageTitle, inputCls } from './ui';

/** Points: who has how many, and a form to give (or take back) extra points. */
export default function Points() {
  const [d, setD] = useState(null);
  const [f, setF] = useState({ email: '', name: '', points: '10', reason: '' });
  const [busy, setBusy] = useState(false);
  const load = () => api.get('/points/admin').then((r) => setD(r.data)).catch(() => setD(false));
  useEffect(() => { load(); }, []);
  const give = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await api.post('/points/award', { ...f, points: Number(f.points) }); toast.success('Points saved'); setF({ email: '', name: '', points: '10', reason: '' }); await load(); }
    catch (ex) { toast.error(ex.response?.data?.error || 'Could not save'); }
    setBusy(false);
  };
  const [edit, setEdit] = useState(null); // { id, points, reason }
  const saveEdit = async () => {
    try { await api.put(`/points/award/${edit.id}`, { points: Number(edit.points), reason: edit.reason }); toast.success('Award corrected'); setEdit(null); await load(); }
    catch (ex) { toast.error(ex.response?.data?.error || 'Could not save'); }
  };
  const undo = async (id) => { try { await api.delete(`/points/award/${id}`); toast.success('Award removed'); load(); } catch (ex) { toast.error(ex.response?.data?.error || 'Could not remove'); } };
  return (
    <div>
      <PageTitle title="Points and badges" sub={`Each event a person is checked in at gives ${d?.per_event || 10} points. Give extra points for helping out or winning.`} />
      <Panel className="mb-6 p-5">
        <form onSubmit={give} className="grid gap-3 sm:grid-cols-6">
          <input className={`${inputCls} sm:col-span-2`} type="email" placeholder="Person's e-mail" aria-label="E-mail" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
          <input className={`${inputCls} sm:col-span-1`} placeholder="Name (optional)" aria-label="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input className={`${inputCls} sm:col-span-1`} type="number" min="-1000" max="1000" placeholder="Points" aria-label="Points" value={f.points} onChange={(e) => setF({ ...f, points: e.target.value })} required />
          <input className={`${inputCls} sm:col-span-2`} placeholder="Reason (e.g. ran the desk)" aria-label="Reason" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} required maxLength={120} />
          <button disabled={busy} className="btn-primary sm:col-span-6 sm:justify-self-start">{busy ? <Loader2 size={15} className="animate-spin" /> : <Award size={15} />} Give points</button>
        </form>
      </Panel>
      {d === null && <div className="h-40 animate-pulse rounded-2xl bg-alt" />}
      {d === false && <p className="text-fg2">Could not load the points.</p>}
      {d && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel className="overflow-hidden">
            <div className="border-b border-line px-5 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">Leaderboard ({d.people.length})</div>
            {d.people.length === 0 ? <p className="p-5 text-sm text-fg2">Nobody has points yet. People get points when they are checked in at an event.</p> : (
              <table className="w-full text-sm"><tbody>{d.people.slice(0, 50).map((p) => (
                <tr key={p.email} className="border-b border-line/60 last:border-0"><td className="w-12 px-5 py-2.5 text-muted">#{p.rank}</td><td className="py-2.5"><div className="font-medium text-fg">{p.full_name || p.name}</div><div className="text-xs text-muted">{p.email} · {p.events} events{p.bonus ? ` · ${p.bonus > 0 ? '+' : ''}${p.bonus} bonus` : ''}</div></td><td className="px-5 py-2.5 text-right font-display text-lg text-accent">{p.points}</td></tr>
              ))}</tbody></table>
            )}
          </Panel>
          <Panel className="overflow-hidden">
            <div className="border-b border-line px-5 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">Extra points given</div>
            {d.awards.length === 0 ? <p className="p-5 text-sm text-fg2">No extra points yet.</p> : (
              <ul>{d.awards.map((a) => (
                <li key={a.id} className="flex items-center gap-3 border-b border-line/60 px-5 py-2.5 last:border-0">{edit?.id === a.id ? (<>
                  <input className={`${inputCls} !w-20`} type="number" aria-label="Points" value={edit.points} onChange={(e) => setEdit({ ...edit, points: e.target.value })} />
                  <input className={`${inputCls} min-w-0 flex-1`} aria-label="Reason" value={edit.reason} maxLength={120} onChange={(e) => setEdit({ ...edit, reason: e.target.value })} />
                  <button onClick={saveEdit} aria-label="Save" className="grid size-8 place-items-center rounded-lg text-emerald-600 hover:bg-emerald-500/10"><Check size={15} /></button>
                  <button onClick={() => setEdit(null)} aria-label="Cancel" className="grid size-8 place-items-center rounded-lg text-fg2 hover:bg-alt"><X size={15} /></button></>) : (<><span className={`w-14 font-display text-lg ${a.points > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{a.points > 0 ? '+' : ''}{a.points}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm text-fg">{a.reason}</span><span className="block truncate text-xs text-muted">{a.name || a.email}</span></span>
                  <button onClick={() => setEdit({ id: a.id, points: a.points, reason: a.reason })} aria-label="Edit this award" className="grid size-8 place-items-center rounded-lg text-fg2 hover:bg-tech/10 hover:text-tech"><Pencil size={14} /></button>
                  <button onClick={() => undo(a.id)} aria-label="Remove this award" className="grid size-8 place-items-center rounded-lg text-fg2 hover:bg-red-500/10 hover:text-red-500"><Trash2 size={14} /></button></>)}</li>
              ))}</ul>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
