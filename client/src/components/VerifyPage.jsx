import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { BadgeCheck, Loader2, ShieldX, Download, Copy, Check, Award, ExternalLink, Search, ArrowRight } from 'lucide-react';
import { Linkedin } from '../lib/brandIcons';
import toast from 'react-hot-toast';
import { api } from '../context/store';
import { formalDate } from '../lib/format';
import { prettyCode } from '../lib/qr';
import { copyText } from '../lib/share';

/** Anyone can check a certificate here (the QR code on every certificate opens this page). Shows only the name, event and date. */
export default function VerifyPage() {
  const { code } = useParams();
  const nav = useNavigate();
  const [r, setR] = useState(null);
  const [copied, setCopied] = useState(false);
  const [searchCode, setSearchCode] = useState('');

  useEffect(() => {
    document.title = 'Verify a certificate | BAUET ICT Club';
    if (!code) {
      setR(null);
      return;
    }
    api.get(`/event-registrations/verify/${code}`).then((x) => setR(x.data)).catch(() => setR({ valid: false }));
  }, [code]);

  const onSearchSubmit = (e) => {
    e.preventDefault();
    const clean = searchCode.trim().toUpperCase();
    if (!clean) return;
    nav(`/verify/${encodeURIComponent(clean)}`);
  };

  const copyLink = async () => {
    const ok = await copyText(window.location.href);
    if (ok) {
      setCopied(true);
      toast.success('Certificate link copied!');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Could not copy link');
    }
  };

  // LinkedIn Certification Deep Link
  const linkedInCertUrl = r?.valid ? (() => {
    const d = r.date ? new Date(r.date) : new Date();
    const certName = encodeURIComponent(`${r.event} - Certificate of Participation`);
    const org = encodeURIComponent(r.issuedBy || 'BAUET ICT Club');
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const certUrl = encodeURIComponent(window.location.href);
    const certId = encodeURIComponent(r.code || code);
    return `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${certName}&organizationName=${org}&issueYear=${y}&issueMonth=${m}&certUrl=${certUrl}&certId=${certId}`;
  })() : '#';

  return (
    <section className="section">
      <div className="container max-w-xl">
        <div className="relative overflow-hidden rounded-3xl border border-line bg-surface p-6 sm:p-10 text-center shadow-[var(--shadow-xl)]">
          {/* Subtle background glow */}
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-accent/10 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-20 size-60 rounded-full bg-emerald-500/10 blur-3xl" />

          {!code ? (
            <div className="py-6">
              <div className="relative mx-auto mb-4 flex size-20 items-center justify-center rounded-2xl bg-accent/10 text-accent ring-8 ring-accent/5">
                <Award size={44} />
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-accent">
                Certificate Verification Ledger
              </span>

              <h1 className="mt-4 text-3xl font-bold tracking-tight text-fg">Verify Certificate</h1>
              <p className="mt-2 text-sm text-fg2 max-w-md mx-auto">
                Every official credential issued by BAUET ICT Club carries a verifiable code and cryptographic QR signature.
              </p>

              <form onSubmit={onSearchSubmit} className="mt-6 flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                    placeholder="Enter Code (e.g. BC-A1B2C3)"
                    aria-label="Certificate code"
                    className="w-full rounded-2xl border border-line bg-bg px-4 py-3 text-sm font-mono uppercase tracking-wider text-fg outline-none focus:border-accent"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="btn-primary !px-5 !py-3 text-xs inline-flex items-center justify-center gap-2"
                >
                  <Search size={15} /> Verify <ArrowRight size={14} />
                </button>
              </form>
            </div>
          ) : r === null ? (
            <div className="py-12">
              <Loader2 className="mx-auto size-10 animate-spin text-accent" />
              <p className="mt-4 text-sm text-fg2 font-mono">Verifying credential on official club ledger...</p>
            </div>
          ) : r.valid ? (
            <>
              <div className="relative mx-auto mb-4 flex size-20 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 ring-8 ring-emerald-500/5">
                <BadgeCheck size={48} className="animate-pulse" />
                <span className="absolute -top-1 -right-1 flex size-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
                  <Award size={14} />
                </span>
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-emerald-600">
                Official Credential Verified
              </span>

              <h1 className="mt-4 text-3xl font-bold tracking-tight text-fg">Certificate is Genuine</h1>
              
              <div className="my-6 rounded-2xl border border-line/70 bg-bg/60 p-5 text-center">
                <p className="text-xs font-mono uppercase tracking-widest text-muted">Awarded To</p>
                <div className="mt-1 font-display text-3xl sm:text-4xl font-bold text-accent">{r.name}</div>
                <div className="mx-auto mt-3 h-px w-24 bg-gradient-to-r from-transparent via-line to-transparent" />
                <p className="mt-3 text-sm text-fg2">
                  for successfully participating in <b className="text-fg">{r.event}</b>
                  {r.date ? <span className="text-fg2"> on {formalDate(r.date)}</span> : ''}.
                </p>
                <p className="mt-1 text-xs text-muted">Issued by <b>{r.issuedBy}</b></p>
              </div>

              <div className="flex items-center justify-center gap-2 rounded-xl bg-alt px-3 py-2 font-mono text-xs tracking-[0.2em] text-muted">
                <span>ID:</span>
                <span className="font-bold text-fg select-all">{prettyCode(r.code)}</span>
              </div>

              {/* Action Buttons: LinkedIn, PDF Download, Copy Link */}
              <div className="mt-6 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2.5">
                <a
                  href={`/api/event-registrations/certificate/${r.code}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary !w-full sm:!w-auto !px-4 !py-2.5 text-xs inline-flex items-center justify-center gap-2"
                >
                  <Download size={15} /> Download PDF
                </a>
                
                <a
                  href={linkedInCertUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline !w-full sm:!w-auto !px-4 !py-2.5 text-xs inline-flex items-center justify-center gap-2 !border-[#0A66C2]/40 text-[#0A66C2] hover:!bg-[#0A66C2]/10"
                >
                  <Linkedin size={15} /> Add to LinkedIn
                </a>

                <button
                  onClick={copyLink}
                  className="btn-outline !w-full sm:!w-auto !px-4 !py-2.5 text-xs inline-flex items-center justify-center gap-2"
                >
                  {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                  {copied ? 'Copied' : 'Copy link'}
                </button>
              </div>
            </>
          ) : (
            <div className="py-6">
              <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 ring-8 ring-red-500/5">
                <ShieldX size={48} />
              </div>
              <h1 className="mt-3 text-2xl font-bold text-fg">Not Verified</h1>
              <p className="mt-3 text-sm text-fg2">
                We could not find any official certificate with code <span className="font-mono font-bold text-red-500">{prettyCode(code?.toUpperCase() || '')}</span>.
              </p>
              <p className="mt-1 text-xs text-muted">
                Please double-check the QR code or verify that the alphanumeric characters match the document.
              </p>

              <form onSubmit={onSearchSubmit} className="mt-6 flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
                <input
                  type="text"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  placeholder="Try another code..."
                  aria-label="Certificate code"
                  className="w-full rounded-2xl border border-line bg-bg px-4 py-3 text-sm font-mono uppercase tracking-wider text-fg outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  className="btn-primary !px-5 !py-3 text-xs inline-flex items-center justify-center gap-2"
                >
                  <Search size={15} /> Verify
                </button>
              </form>
            </div>
          )}

          <div className="mt-8 border-t border-line/60 pt-5">
            <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-accent transition">
              BAUET ICT Club Official Portal <ExternalLink size={12} />
            </Link>
          </div>
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
