import { Mail } from 'lucide-react';

/** Shown right after someone submits something: the confirmation is an email, and it often lands in Spam. */
export default function CheckEmailNote({ email, className = '' }) {
  return (
    <div role="note" className={`flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-left text-sm text-fg ${className}`}>
      <Mail size={18} className="mt-0.5 shrink-0 text-amber-600" />
      <p className="leading-6"><b>Please check your email{email ? ` (${email})` : ''} now.</b> It can take a minute. If you cannot find our message, look in the <b>Spam / Junk</b> folder (and <b>Promotions</b> in Gmail), then mark it <b>“Not spam”</b> so the next ones arrive in your inbox.</p>
    </div>
  );
}
