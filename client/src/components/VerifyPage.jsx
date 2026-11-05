import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BadgeCheck, Loader2, ShieldX } from 'lucide-react';
import { api } from '../context/store';
import { formalDate } from '../lib/format';
import { prettyCode } from '../lib/qr';

/** Anyone can check a certificate here (the QR code on every certificate opens this page). Shows only the name, event and date. */
export default function VerifyPage() {
  const { code } = useParams();
  const [r, setR] = useState(null);
  useEffect(() => { document.title = 'Verify a certificate | BAUET ICT Club'; api.get(`/event-registrations/verify/${code}`).then((x) => setR(x.data)).catch(() => setR({ valid: false })); }, [code]);
  return (
    <section className="section">
      <div className="container max-w-lg">
        <div className="rounded-3xl border border-line bg-surface p-8 text-center shadow-[var(--shadow-md)]">
          {r === null ? <Loader2 className="mx-auto animate-spin text-muted" /> : r.valid ? (
            <>
              <BadgeCheck size={56} className="mx-auto text-emerald-500" />
              <h1 className="mt-3 text-3xl text-fg">Certificate is genuine</h1>
              <p className="mt-4 text-fg2">Issued by <b>{r.issuedBy}</b> to</p>
              <div className="font-display text-3xl text-accent">{r.name}</div>
              <p className="mt-3 text-fg2">for taking part in <b>{r.event}</b>{r.date ? `, ${formalDate(r.date)}` : ''}.</p>
              <div className="mt-5 font-mono text-sm tracking-[0.25em] text-muted">{prettyCode(r.code)}</div>
            </>
          ) : (
            <>
              <ShieldX size={56} className="mx-auto text-red-500" />
              <h1 className="mt-3 text-3xl text-fg">Not verified</h1>
              <p className="mt-2 text-fg2">We have no certificate with the code <span className="font-mono">{prettyCode(code.toUpperCase())}</span>. Check that it was typed correctly.</p>
            </>
          )}
          <Link to="/" className="btn-outline mt-7 inline-flex !px-5 !py-2.5 text-xs">BAUET ICT Club website</Link>
        </div>
      </div>
    </section>
  );
}

/** /certificate/<code> just opens the PDF. */
export function CertificateRedirect() {
  const { code } = useParams();
  useEffect(() => { window.location.replace(`/api/event-registrations/certificate/${code}`); }, [code]);
  return <section className="section"><div className="container grid min-h-[40vh] place-items-center"><Loader2 className="animate-spin text-muted" /></div></section>;
}
