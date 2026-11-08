import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Draws page 1 of a PDF as a picture, so it is fully visible in every browser (many phones and embedded browsers cannot show a PDF inside a page).
 * `blob` is the PDF; the picture follows the width of its box.
 */
export default function PdfCanvas({ blob, className = '' }) {
  const box = useRef(null);
  const canvas = useRef(null);
  const [state, setState] = useState('idle'); // idle | busy | error

  useEffect(() => {
    if (!blob) return undefined;
    let dead = false;
    let doc = null;
    (async () => {
      setState('busy');
      try {
        const pdfjs = await import('pdfjs-dist');
        const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
        pdfjs.GlobalWorkerOptions.workerSrc = worker;
        doc = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
        const page = await doc.getPage(1);
        if (dead) return;
        const width = Math.max(280, box.current?.clientWidth || 800);
        const base = page.getViewport({ scale: 1 });
        const scale = (width / base.width) * Math.min(window.devicePixelRatio || 1, 2);
        const vp = page.getViewport({ scale });
        const c = canvas.current;
        c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
        c.style.width = '100%'; c.style.height = 'auto';
        await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
        if (!dead) setState('idle');
      } catch { if (!dead) setState('error'); }
    })();
    return () => { dead = true; doc?.destroy?.(); };
  }, [blob]);

  return (
    <div ref={box} className={`relative ${className}`}>
      <canvas ref={canvas} role="img" aria-label="Certificate preview" className="block w-full rounded-xl border border-line bg-white" style={{ aspectRatio: '1.4142 / 1' }} />
      {state === 'busy' && <span className="absolute inset-0 grid place-items-center"><Loader2 size={22} className="animate-spin text-tech" /></span>}
      {state === 'error' && <p role="alert" className="absolute inset-0 grid place-items-center p-4 text-center text-sm text-red-500">The picture could not be drawn. Use "Open full size".</p>}
    </div>
  );
}
