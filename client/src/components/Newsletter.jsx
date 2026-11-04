import { useState } from 'react';
import toast from 'react-hot-toast';
import { Mail, Loader2, Check } from 'lucide-react';
import { api } from '../context/store';

/** Email signup for club news. One row per email on the server; never reveals whether an address was already subscribed. */
export default function Newsletter({ className = '' }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle');

  const submit = async (e) => {
    e.preventDefault();
    setState('busy');
    try {
      await api.post('/subscribers', { email });
      setState('done'); setEmail('');
    } catch (err) {
      setState('idle');
      toast.error(err.response?.data?.error || 'Could not subscribe right now');
    }
  };

  return (
    <div className={className}>
      <div className="mb-1 flex items-center gap-2 font-display text-xl text-fg"><Mail size={18} className="text-tech" /> Never miss an event</div>
      <p className="mb-4 text-sm text-fg2">Get news about workshops, contests and notices straight to your inbox.</p>
      {state === 'done' ? (
        <div className="flex items-center gap-2 rounded-2xl border border-tech/40 bg-tech/10 px-4 py-3 text-sm font-medium text-tech"><Check size={16} /> You are subscribed. Thank you!</div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
          <input type="email" name="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" aria-label="Email address"
            className="min-w-0 flex-1 rounded-full border border-line bg-bg/60 px-5 py-3 text-sm text-fg outline-none transition placeholder:text-muted focus:border-tech focus:ring-4 focus:ring-tech/15" />
          <button type="submit" disabled={state === 'busy'} className="btn-primary !py-3 disabled:opacity-60">{state === 'busy' ? <Loader2 size={16} className="animate-spin" /> : 'Subscribe'}</button>
        </form>
      )}
    </div>
  );
}
