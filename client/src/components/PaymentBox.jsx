import { Copy, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { inputCls } from './join/shared';
import { copyText } from '../lib/share';
import { cn } from '../lib/cn';

const COLORS = { bKash: '#E2136E', Nagad: '#F6921E', Rocket: '#8C3494' };

/** Shows how much to pay and where (bKash, Nagad or Rocket), then asks for the method, the sender number and the transaction ID. */
export default function PaymentBox({ setting, value, errors = {}, onChange }) {
  const v = { method: setting.methods[0], sender: '', trx_id: '', ...value };
  const set = (k, x) => onChange({ ...v, [k]: x });
  const number = setting.numbers?.[v.method];
  const copy = async () => { toast[(await copyText(number)) ? 'success' : 'error']((await copyText(number)) ? 'Number copied' : 'Could not copy'); };
  return (
    <div className="rounded-2xl border border-line bg-alt/50 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg"><Wallet size={16} className="text-accent" /> Payment: <span className="font-display text-lg text-accent">{setting.amount} BDT</span></div>
      {setting.methods.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Payment method">
          {setting.methods.map((m) => (
            <button key={m} type="button" role="radio" aria-checked={v.method === m} onClick={() => set('method', m)}
              className={cn('rounded-full border px-4 py-1.5 text-xs font-semibold transition', v.method === m ? 'text-white' : 'border-line text-fg2 hover:border-muted')}
              style={v.method === m ? { background: COLORS[m], borderColor: COLORS[m] } : undefined}>{m}</button>
          ))}
        </div>
      )}
      <div className="rounded-xl border border-line bg-surface p-3.5 text-sm">
        <div className="text-xs text-muted">Send {setting.kind === 'payment' ? 'with Payment' : 'Money'} to this {v.method} number</div>
        <div className="mt-1 flex items-center justify-between gap-3">
          <span className="font-mono text-lg tracking-wide text-fg">{number}</span>
          <button type="button" onClick={copy} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-fg2 hover:border-tech hover:text-tech"><Copy size={13} /> Copy</button>
        </div>
        {setting.note && <p className="mt-2 whitespace-pre-line text-xs text-fg2">{setting.note}</p>}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block"><span className="mb-1.5 block text-sm font-semibold text-fg">Your {v.method} number <span className="text-red-500">*</span></span>
          <input className={inputCls(errors.sender)} type="tel" inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" value={v.sender} onChange={(e) => set('sender', e.target.value)} />
          {errors.sender && <span className="mt-1 block text-xs text-red-500">{errors.sender}</span>}</label>
        <label className="block"><span className="mb-1.5 block text-sm font-semibold text-fg">Transaction ID <span className="text-red-500">*</span></span>
          <input className={cn(inputCls(errors.trx_id), 'font-mono uppercase')} autoCapitalize="characters" autoComplete="off" spellCheck={false} placeholder="e.g. 8N7A6D5E4C" value={v.trx_id} onChange={(e) => set('trx_id', e.target.value.toUpperCase())} />
          {errors.trx_id && <span className="mt-1 block text-xs text-red-500">{errors.trx_id}</span>}</label>
      </div>
      {errors.method && <span className="mt-2 block text-xs text-red-500">{errors.method}</span>}
      <p className="mt-3 text-xs text-muted">After you send the money, enter the transaction ID from the {v.method} message. We check it and confirm your place by email.</p>
    </div>
  );
}
