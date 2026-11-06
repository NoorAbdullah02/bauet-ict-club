import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Download, Loader2, Megaphone, Trash2 } from 'lucide-react';
import { api } from '../context/store';
import { Drawer, inputCls, askConfirm } from './ui';
import { saveFile } from '../lib/download';

/** The teams of one contest: contact details, give places, publish the results (which also gives points). */
export default function ContestTeams({ contest, onClose }) {
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState(false);
  const id = contest?.id;
  const load = () => api.get(`/contest-teams/admin/${id}`).then((r) => setD(r.data)).catch(() => setD(false));
  useEffect(() => { setD(null); if (id) load(); }, [id]);

  const patch = async (t, body) => {
    try { await api.patch(`/contest-teams/admin/team/${t.id}`, body); await load(); }
    catch (ex) { toast.error(ex.response?.data?.error || 'Could not save'); }
  };
  const remove = async (t) => {
    if (!(await askConfirm({ title: 'Remove this team?', message: `“${t.team_name}” will be removed from the list.`, confirmText: 'Remove', danger: true }))) return;
    try { await api.delete(`/contest-teams/admin/team/${t.id}`); await load(); } catch (ex) { toast.error(ex.response?.data?.error || 'Could not remove'); }
  };
  const publish = async () => {
    const pp = d?.prize_points || {};
    if (!(await askConfirm({ title: 'Publish the results?', message: `Everyone can then see the places on the website and in the app. Points are given to every team member: 1st ${pp[1]}, 2nd ${pp[2]}, 3rd ${pp[3]}, others ${d?.participation_points}.`, confirmText: 'Publish and give points' }))) return;
    setBusy(true);
    try { const r = await api.post(`/contest-teams/admin/${id}/publish`); toast.success(`Results published. ${r.data.awards_given} point awards given.`); await load(); }
    catch (ex) { toast.error(ex.response?.data?.error || 'Could not publish'); }
    setBusy(false);
  };
  const hide = async () => { try { await api.post(`/contest-teams/admin/${id}/unpublish`); toast.success('Results hidden'); await load(); } catch (ex) { toast.error(ex.response?.data?.error || 'Could not hide'); } };
  const exportCsv = () => saveFile(`/contest-teams/admin/${id}/export`, {}, `contest-${id}-teams.csv`);

  const teams = d?.teams || [];
  return (
    <Drawer open={!!contest} title={`Teams: ${contest?.title || ''}`} onClose={onClose}>
      {d === null && <div className="h-32 animate-pulse rounded-2xl bg-alt" />}
      {d === false && <p className="text-fg2">Could not load the teams.</p>}
      {d && (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <button onClick={exportCsv} className="btn-outline !px-4 !py-2 text-xs"><Download size={14} /> Spreadsheet</button>
            {d.contest.results_published
              ? <button onClick={hide} className="btn-outline !px-4 !py-2 text-xs">Hide the results</button>
              : <button onClick={publish} disabled={busy} className="btn-primary !px-4 !py-2 text-xs">{busy ? <Loader2 size={14} className="animate-spin" /> : <Megaphone size={14} />} Publish results</button>}
          </div>
          <p className="mb-4 text-xs text-muted">{d.contest.results_published ? 'The results are public. You can still change places and publish again.' : 'Type each team\'s place (1, 2, 3 ...), then publish. Points go to every team member who gave an e-mail.'}</p>
          {teams.length === 0 && <p className="py-8 text-center text-fg2">No team has signed up yet.</p>}
          <ul className="space-y-3">
            {teams.map((t) => (
              <li key={t.id} className="rounded-2xl border border-line p-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-fg">{t.team_name}</div>
                    <div className="text-xs text-fg2">{t.leader_name} · {t.email}{t.phone ? ` · ${t.phone}` : ''}</div>
                    {(t.members || []).length > 0 && <div className="mt-1 text-xs text-muted">{t.members.map((m) => [m.name, m.student_id].filter(Boolean).join(' ')).join(', ')}</div>}
                  </div>
                  <button onClick={() => remove(t)} aria-label="Remove team" className="grid size-8 shrink-0 place-items-center rounded-lg text-fg2 hover:bg-red-500/10 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <input className={inputCls} type="number" min="1" placeholder="Place" aria-label="Place" defaultValue={t.rank ?? ''} onBlur={(e) => { if (String(t.rank ?? '') !== e.target.value) patch(t, { rank: e.target.value }); }} />
                  <input className={inputCls} type="number" step="any" placeholder="Score" aria-label="Score" defaultValue={t.score ?? ''} onBlur={(e) => { if (String(t.score ?? '') !== e.target.value) patch(t, { score: e.target.value }); }} />
                  <select className={inputCls} aria-label="Status" value={t.status} onChange={(e) => patch(t, { status: e.target.value })}><option>registered</option><option>disqualified</option><option>withdrawn</option></select>
                </div>
                <input className={`${inputCls} mt-2`} placeholder="Prize note (e.g. Trophy and 5000 BDT)" aria-label="Prize note" maxLength={160} defaultValue={t.prize_note || ''} onBlur={(e) => { if ((t.prize_note || '') !== e.target.value) patch(t, { prize_note: e.target.value }); }} />
              </li>
            ))}
          </ul>
        </>
      )}
    </Drawer>
  );
}
