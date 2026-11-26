import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, Download, FileSpreadsheet, Loader2, Megaphone, Pencil, Trash2 } from 'lucide-react';
import useStore, { api } from '../context/store';
import { Drawer, inputCls, askConfirm } from './ui';
import { canDelete } from './roles';
import { saveFile } from '../lib/download';

const membersToText = (ms) => (ms || []).map((m) => [m.name, m.email, m.student_id].filter(Boolean).join(', ')).join('\n');
const textToMembers = (t) => String(t || '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [name, email, student_id] = l.split(',').map((x) => x.trim()); return { name, email: email || '', student_id: student_id || '' }; });

/** Correct a team's name, leader, contact details and members. */
function TeamEdit({ team, onSave, onCancel }) {
  const [f, setF] = useState({ team_name: team.team_name, leader_name: team.leader_name, email: team.email, phone: team.phone || '', members: membersToText(team.members) });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  return (
    <div className="mt-3 space-y-2 rounded-xl bg-alt p-3">
      <input className={inputCls} aria-label="Team name" placeholder="Team name" value={f.team_name} onChange={(e) => set('team_name', e.target.value)} maxLength={80} />
      <div className="grid gap-2 sm:grid-cols-2">
        <input className={inputCls} aria-label="Leader" placeholder="Leader's name" value={f.leader_name} onChange={(e) => set('leader_name', e.target.value)} />
        <input className={inputCls} aria-label="E-mail" type="email" placeholder="Leader's e-mail" value={f.email} onChange={(e) => set('email', e.target.value)} />
      </div>
      <input className={inputCls} aria-label="Phone" placeholder="Phone" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
      <textarea className={`${inputCls} min-h-24`} aria-label="Members" placeholder={'Members, one per line: name, e-mail, student ID'} value={f.members} onChange={(e) => set('members', e.target.value)} />
      <div className="flex gap-2">
        <button type="button" onClick={() => onSave({ ...f, members: textToMembers(f.members) })} className="btn-primary !px-4 !py-2 text-xs"><Check size={14} /> Save</button>
        <button type="button" onClick={onCancel} className="btn-outline !px-4 !py-2 text-xs">Cancel</button>
      </div>
    </div>
  );
}

/** The teams of one contest: contact details, give places, publish the results (which also gives points). */
export default function ContestTeams({ contest, onClose }) {
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const user = useStore((s) => s.user);
  const id = contest?.id;
  const load = () => api.get(`/contest-teams/admin/${id}`).then((r) => setD(r.data)).catch(() => setD(false));
  useEffect(() => { setD(null); if (id) load(); }, [id]);

  const patch = async (t, body) => {
    try { await api.patch(`/contest-teams/admin/team/${t.id}`, body); await load(); return true; }
    catch (ex) { toast.error(ex.response?.data?.error || 'Could not save'); return false; }
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
  const exportTeams = (format) => saveFile(`/contest-teams/admin/${id}/export`, { format }, `contest-${id}-teams.${format}`);

  const teams = d?.teams || [];
  return (
    <Drawer open={!!contest} title={`Teams: ${contest?.title || ''}`} onClose={onClose}>
      {d === null && <div className="h-32 animate-pulse rounded-2xl bg-alt" />}
      {d === false && <p className="text-fg2">Could not load the teams.</p>}
      {d && (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <button onClick={() => exportTeams('xlsx')} className="btn-outline !px-4 !py-2 text-xs"><FileSpreadsheet size={14} /> Excel</button>
            <button onClick={() => exportTeams('csv')} className="btn-outline !px-4 !py-2 text-xs"><Download size={14} /> CSV</button>
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
                  <button onClick={() => setEditing(editing === t.id ? null : t.id)} aria-label="Edit team details" title="Edit team details" className="grid size-8 shrink-0 place-items-center rounded-lg text-fg2 hover:bg-tech/10 hover:text-tech"><Pencil size={14} /></button>
                  {canDelete(user) && <button onClick={() => remove(t)} aria-label="Remove team" className="grid size-8 shrink-0 place-items-center rounded-lg text-fg2 hover:bg-red-500/10 hover:text-red-500"><Trash2 size={14} /></button>}
                </div>
                {editing === t.id && <TeamEdit team={t} onCancel={() => setEditing(null)} onSave={async (body) => { if (await patch(t, body)) { setEditing(null); toast.success('Team saved'); } }} />}
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
