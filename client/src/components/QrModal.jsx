import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Loader2, X } from 'lucide-react';
import { qrDataUrl } from '../lib/qr';

/** The QR code of a link, big enough for a poster. Download it as a PNG. */
export default function QrModal({ url, title, onClose }) {
  const [img, setImg] = useState('');
  const [big, setBig] = useState('');
  useEffect(() => { qrDataUrl(url, 420).then(setImg).catch(() => {}); qrDataUrl(url, 1600).then(setBig).catch(() => {}); }, [url]);
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-[370] grid place-items-center bg-black/60 p-4" onClick={onClose} role="dialog" aria-label="QR code">
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-sm rounded-3xl border border-line bg-surface p-7 text-center shadow-[var(--shadow-xl)]">
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 grid size-9 place-items-center rounded-full text-fg2 hover:bg-accent/10"><X size={18} /></button>
        <h3 className="pr-8 text-xl text-fg">{title || 'QR code'}</h3>
        <p className="mt-1 text-xs text-fg2">Put it on a poster. Phones that scan it open the link.</p>
        <div className="mx-auto mt-5 grid size-64 place-items-center rounded-2xl border border-line bg-white p-2">{img ? <img src={img} alt="QR code" className="size-full" /> : <Loader2 className="animate-spin text-muted" />}</div>
        <div className="mt-3 break-all font-mono text-xs text-muted">{url}</div>
        <a href={big || img} download={`qr-${(title || 'link').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.png`} className="btn-primary mt-5 inline-flex w-full justify-center"><Download size={15} /> Download PNG</a>
      </div>
    </div>,
    document.body,
  );
}
