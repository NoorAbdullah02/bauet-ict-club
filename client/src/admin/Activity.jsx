import { useEffect, useState } from 'react';
import { Loader2, ListChecks, Search } from 'lucide-react';
import { api } from '../context/store';
import { Panel, PageTitle, inputCls } from './ui';

const WHAT = { events: 'an event', notices: 'a notice', members: 'a committee member', gallery: 'a gallery photo', achievements: 'an award', posts: 'a post', forms: 'a form', 'event-registrations': 'a sign-up', registrations: 'an application', committees: 'the committee', settings: 'the site settings', team: 'a team login', trash: 'the trash', messages: 'a message', email: 'an email', auth: 'a password', backup: 'a backup' };
const VERB = { POST: 'Added or sent', PUT: 'Changed', PATCH: 'Changed', DELETE: 'Deleted' };
const say = (r) => { const seg = r.path.split('/').filter(Boolean); const noun = WHAT[seg[1]] || seg[1]; const extra = /payment/.test(r.path) ? ' (payment check)' : /answers/.test(r.path) ? ' (an answer corrected)' : /checkin/.test(r.path) ? ' (check-in)' : ''; return `${VERB[r.method] || r.method} ${noun}${extra}`; };
const when = (v) => new Date(v).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

/** Main admin only: who changed what, newest first (kept 10 days). */
export default function Activity() {
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  useEffect(() => { api.get('/audit').then((r) => setRows(r.data)).catch(() => setRows([])); }, []);
  const s = q.trim().toLowerCase();
  const shown = rows ? (s ? rows.filter((r) => `${r.username} ${r.method} ${r.path} ${say(r)}`.toLowerCase().includes(s)) : rows) : null;
  return (
    <div>
      <PageTitle title="Activity" sub="Who changed what. The last 300 actions, kept for 10 days.">
        {rows?.length > 0 && (
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search activity…" className={`${inputCls} !w-52 !rounded-full !py-2 pl-9`} />
          </div>
        )}
      </PageTitle>
      <Panel className="overflow-hidden">
        {shown === null ? <div className="p-6"><Loader2 className="animate-spin text-muted" /></div> : shown.length === 0 ? <p className="p-8 text-center text-sm text-muted">Nothing yet.</p> : (
          <ul className="divide-y divide-line">
            {shown.map((r) => (
              <li key={r.id} className="flex items-start gap-3 px-5 py-3 text-sm">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-accent/10 text-accent"><ListChecks size={14} /></span>
                <div className="min-w-0 flex-1"><div className="text-fg"><b>{r.username}</b> · {say(r)}</div><div className="truncate font-mono text-[11px] text-muted">{r.method} {r.path}</div></div>
                <time className="shrink-0 text-xs text-muted">{when(r.created_at)}</time>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
