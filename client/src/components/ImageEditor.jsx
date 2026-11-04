import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, RotateCw, ZoomIn, Check } from 'lucide-react';
import { cn } from '../lib/cn';

const SHAPES = [['1:1', 1], ['4:3', 4 / 3], ['16:9', 16 / 9], ['3:4', 3 / 4]];
const SIZES = [['Small', 640], ['Medium', 1000], ['Large', 1600], ['HD', 2400]]; // HD keeps enough detail to print a poster
const STAGE_W = 360;

/**
 * Crop, zoom, rotate and resize a picture before it is uploaded.
 * Drag to move, slider to zoom. onDone(file) gets the finished JPEG (PNG when `keepPng`), onCancel closes without uploading.
 */
export default function ImageEditor({ file, aspect = null, keepPng = false, onDone, onCancel }) {
  const [src, setSrc] = useState(null);
  const [img, setImg] = useState(null);
  const [ratio, setRatio] = useState(aspect || 4 / 3); // null = keep the picture's own shape
  const [keepShape, setKeepShape] = useState(!aspect && keepPng);
  const [zoom, setZoom] = useState(1);
  const [rot, setRot] = useState(0);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState(1600);
  const drag = useRef(null);

  useEffect(() => {
    let dead = false; // a cleaned-up run (React dev double mount) must not close the editor
    const url = URL.createObjectURL(file);
    const i = new Image();
    i.onload = () => { if (dead) return; setImg(i); setSrc(url); if (!aspect && keepPng) setRatio(i.naturalWidth / i.naturalHeight); };
    i.onerror = () => { if (!dead) onDone(file); }; // the browser cannot open it (for example an iPhone HEIC): upload it as it is, the server converts it
    i.src = url;
    return () => { dead = true; URL.revokeObjectURL(url); };
  }, [file]);

  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onCancel]);

  const swap = rot % 180 !== 0;
  const iw = img ? (swap ? img.naturalHeight : img.naturalWidth) : 1;
  const ih = img ? (swap ? img.naturalWidth : img.naturalHeight) : 1;
  const r = keepShape ? iw / ih : ratio;
  const stageH = Math.round(STAGE_W / r);
  // scale at which the picture just covers the crop box
  const cover = Math.max(STAGE_W / iw, stageH / ih);
  const scale = cover * zoom;
  const limit = useMemo(() => ({ x: Math.max(0, (iw * scale - STAGE_W) / 2), y: Math.max(0, (ih * scale - stageH) / 2) }), [iw, ih, scale, stageH]);
  const clamp = (p) => ({ x: Math.min(limit.x, Math.max(-limit.x, p.x)), y: Math.min(limit.y, Math.max(-limit.y, p.y)) });
  const at = clamp(pos);

  const down = (e) => { drag.current = { x: e.clientX - at.x, y: e.clientY - at.y }; e.currentTarget.setPointerCapture(e.pointerId); };
  const move = (e) => { if (drag.current) setPos(clamp({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y })); };
  const up = () => { drag.current = null; };

  const apply = async () => {
    const outW = Math.min(size, Math.round(iw * 1)); // never upscale beyond the original
    const w = Math.min(size, Math.max(160, outW));
    const h = Math.round(w / r);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!keepPng) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }
    const k = w / STAGE_W; // stage pixels -> output pixels
    ctx.translate(w / 2 + at.x * k, h / 2 + at.y * k);
    ctx.rotate((rot * Math.PI) / 180);
    const dw = img.naturalWidth * scale * k, dh = img.naturalHeight * scale * k;
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    // WebP keeps transparency and is much smaller; old browsers that cannot make WebP fall back to PNG / JPEG
    let blob = await new Promise((res) => canvas.toBlob(res, 'image/webp', 0.9));
    if (!blob || blob.type !== 'image/webp') blob = await new Promise((res) => canvas.toBlob(res, keepPng ? 'image/png' : 'image/jpeg', 0.9));
    if (!blob) return onCancel();
    const ext = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg' }[blob.type] || 'jpg';
    onDone(new File([blob], file.name.replace(/\.\w+$/, `.${ext}`), { type: blob.type }));
  };

  return createPortal(
    <div className="fixed inset-0 z-[360] grid place-items-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onCancel} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div role="dialog" aria-label="Edit picture" initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative flex max-h-[94vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-line bg-bg shadow-[var(--shadow-xl)]">
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="text-lg text-fg">Adjust picture</h3>
          <button onClick={onCancel} aria-label="Close" className="grid size-9 place-items-center rounded-full text-fg2 hover:bg-accent/10 hover:text-accent"><X size={18} /></button>
        </header>

        <div className="overflow-y-auto px-5 py-5">
          <div className="mx-auto overflow-hidden rounded-2xl border border-line bg-[repeating-conic-gradient(#e6ebf5_0%_25%,#fff_0%_50%)] bg-[length:16px_16px]" style={{ width: STAGE_W, maxWidth: '100%', aspectRatio: String(r) }}>
            {src && (
              <div onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} className="relative size-full cursor-grab touch-none select-none active:cursor-grabbing">
                <img src={src} alt="" draggable={false} className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
                  style={{ width: img.naturalWidth * scale, height: img.naturalHeight * scale, transform: `translate(-50%, -50%) translate(${at.x}px, ${at.y}px) rotate(${rot}deg)` }} />
                <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-40">{Array.from({ length: 9 }).map((_, i) => <span key={i} className="border border-white/50" />)}</div>
              </div>
            )}
          </div>
          <p className="mt-2 text-center text-xs text-muted">Drag to move · slider to zoom</p>

          <div className="mt-4 flex items-center gap-3">
            <ZoomIn size={16} className="text-fg2" />
            <input type="range" min="1" max="4" step="0.01" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Zoom" className="flex-1 accent-[#1F4FD8]" />
            <button type="button" onClick={() => { setRot((v) => (v + 90) % 360); setPos({ x: 0, y: 0 }); }} aria-label="Rotate" className="grid size-9 place-items-center rounded-full border border-line text-fg2 hover:border-accent hover:text-accent"><RotateCw size={16} /></button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">Shape</span>
            {SHAPES.map(([label, v]) => (
              <button key={label} type="button" disabled={!!aspect} onClick={() => { setKeepShape(false); setRatio(v); setPos({ x: 0, y: 0 }); }}
                className={cn('rounded-full border px-3 py-1 text-xs transition disabled:opacity-40', !keepShape && Math.abs(r - v) < 0.01 ? 'border-accent bg-accent text-white' : 'border-line text-fg2 hover:border-accent')}>{label}</button>
            ))}
            {!aspect && <button type="button" onClick={() => { setKeepShape(true); setPos({ x: 0, y: 0 }); }} className={cn('rounded-full border px-3 py-1 text-xs transition', keepShape ? 'border-accent bg-accent text-white' : 'border-line text-fg2 hover:border-accent')}>Original</button>}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">Quality</span>
            {SIZES.map(([label, v]) => (
              <button key={label} type="button" onClick={() => setSize(v)} className={cn('rounded-full border px-3 py-1 text-xs transition', size === v ? 'border-accent bg-accent text-white' : 'border-line text-fg2 hover:border-accent')}>{label} · {v}px</button>
            ))}
          </div>
        </div>

        <footer className="flex flex-wrap justify-end gap-3 border-t border-line px-5 py-4">
          <button type="button" onClick={() => onDone(file)} className="rounded-full border border-line px-4 py-2.5 text-sm text-fg2 hover:border-accent">Use original</button>
          <button type="button" disabled={!img} onClick={apply} className="btn-primary !px-5 !py-2.5 text-sm disabled:opacity-60"><Check size={15} /> Apply &amp; upload</button>
        </footer>
      </motion.div>
    </div>,
    document.body,
  );
}
