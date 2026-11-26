import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, RotateCw, ZoomIn, Check, FlipHorizontal2, FlipVertical2, RotateCcw } from 'lucide-react';
import { cn } from '../lib/cn';

const SHAPES = [['1:1', 1, 1], ['4:3', 4, 3], ['16:9', 16, 9], ['3:4', 3, 4]];
const SIZES = [['Small', 640], ['Medium', 1000], ['Large', 1600], ['HD', 2400]]; // the long side; HD keeps enough detail to print a poster
const MIN_SIDE = 160; // the long side of the finished picture never goes below this
const MAX_SIDE = 4000;
const STAGE = 360; // the crop box is at most 360 px each way, so a very wide or tall shape still fits the dialog
const LOOKS = [['Original', 100, 100, 100], ['Vivid', 102, 112, 145], ['Bright', 112, 105, 110], ['Soft', 105, 88, 90], ['Mono', 100, 110, 0], ['Punch', 98, 130, 125]]; // brightness, contrast, colour in %

// The long side sets the output size and the shape sets the other side, so the width and height in the fields are
// always exactly what gets saved (a 1 : 50 shape cannot turn into a 100 000 px tall canvas either).
const outSize = (long, r) => {
  const L = Math.min(MAX_SIDE, Math.max(MIN_SIDE, Math.round(long)));
  return r >= 1 ? { w: L, h: Math.max(1, Math.round(L / r)) } : { w: Math.max(1, Math.round(L * r)), h: L };
};

/**
 * Crop, zoom, rotate and resize a picture before it is uploaded.
 * Drag to move, wheel or slider to zoom. onDone(file) gets the finished WebP (PNG for `keepPng`), onCancel closes without uploading.
 */
export default function ImageEditor({ file, aspect = null, keepPng = false, onDone, onCancel }) {
  const [src, setSrc] = useState(null);
  const [img, setImg] = useState(null);
  const [ratio, setRatio] = useState(aspect || (keepPng ? null : 4 / 3)); // null = keep the picture's own shape
  const [zoom, setZoom] = useState(1);
  const [rot, setRot] = useState(0);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState(1600); // long side of the finished picture
  const [flip, setFlip] = useState(false);
  const [flipY, setFlipY] = useState(false);
  const [tilt, setTilt] = useState(0); // straighten, in degrees
  const [shapeW, setShapeW] = useState(4); // custom shape, typed as W : H
  const [shapeH, setShapeH] = useState(3);
  const [q, setQ] = useState(0.85); // 0.5 .. 1 file quality
  const [look, setLook] = useState({ b: 100, c: 100, s: 100, name: 'Original' });
  const filter = `brightness(${look.b}%) contrast(${look.c}%) saturate(${look.s}%)`;
  const drag = useRef(null);
  const stageRef = useRef(null);

  useEffect(() => {
    let dead = false; // a cleaned-up run (React dev double mount) must not close the editor
    const url = URL.createObjectURL(file);
    const i = new Image();
    i.onload = () => { if (dead) return; setImg(i); setSrc(url); };
    i.onerror = () => { if (!dead) onDone(file); }; // the browser cannot open it (for example an iPhone HEIC): upload it as it is, the server converts it
    i.src = url;
    return () => { dead = true; URL.revokeObjectURL(url); };
  }, [file]);

  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onCancel]);

  // mouse wheel over the picture zooms it in and out
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const onWheel = (e) => { e.preventDefault(); setZoom((z) => Math.min(4, Math.max(1, z - e.deltaY * 0.0012))); };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [src]);

  const swap = rot % 180 !== 0;
  const iw = img ? (swap ? img.naturalHeight : img.naturalWidth) : 1;
  const ih = img ? (swap ? img.naturalWidth : img.naturalHeight) : 1;
  const r = ratio ?? iw / ih;
  const stageW = Math.min(STAGE, STAGE * r); // tall shapes get a narrower box instead of a taller one
  const stageH = stageW / r;
  // scale at which the picture just covers the crop box
  const cover = Math.max(stageW / iw, stageH / ih);
  const scale = cover * zoom;
  const limit = useMemo(() => ({ x: Math.max(0, (iw * scale - stageW) / 2), y: Math.max(0, (ih * scale - stageH) / 2) }), [iw, ih, scale, stageW, stageH]);
  const out = outSize(size, r);
  const pickShape = (w, h) => { setShapeW(w); setShapeH(h); setRatio(w / h); setPos({ x: 0, y: 0 }); };
  // the exact fields work backwards to the long side, so what they show is what is saved
  const setWidth = (v) => { if (v > 0) setSize(r >= 1 ? v : v / r); };
  const setHeight = (v) => { if (v > 0) setSize(r >= 1 ? v * r : v); };
  const clamp = (p) => ({ x: Math.min(limit.x, Math.max(-limit.x, p.x)), y: Math.min(limit.y, Math.max(-limit.y, p.y)) });
  const at = clamp(pos);

  const down = (e) => { drag.current = { x: e.clientX - at.x, y: e.clientY - at.y }; e.currentTarget.setPointerCapture(e.pointerId); };
  const move = (e) => { if (drag.current) setPos(clamp({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y })); };
  const up = () => { drag.current = null; };

  const apply = async () => {
    const { w, h } = out;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!keepPng) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }
    const k = w / stageW; // stage pixels -> output pixels
    ctx.translate(w / 2 + at.x * k, h / 2 + at.y * k);
    ctx.rotate(((rot + tilt) * Math.PI) / 180);
    ctx.scale(flip ? -1 : 1, flipY ? -1 : 1);
    ctx.filter = filter;
    const dw = img.naturalWidth * scale * k, dh = img.naturalHeight * scale * k;
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    // WebP keeps transparency and is much smaller; old browsers that cannot make WebP fall back to PNG / JPEG
    let blob = await new Promise((res) => canvas.toBlob(res, 'image/webp', q));
    if (!blob || blob.type !== 'image/webp') blob = await new Promise((res) => canvas.toBlob(res, keepPng ? 'image/png' : 'image/jpeg', q));
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

        <div data-lenis-prevent className="overflow-y-auto overscroll-contain px-5 py-5">
          <div ref={stageRef} className="mx-auto overflow-hidden rounded-2xl border border-line bg-[repeating-conic-gradient(#e6ebf5_0%_25%,#fff_0%_50%)] bg-[length:16px_16px]" style={{ width: stageW, maxWidth: '100%', aspectRatio: String(r) }}>
            {src && (
              <div onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} className="relative size-full cursor-grab touch-none select-none active:cursor-grabbing">
                <img src={src} alt="" draggable={false} className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
                  style={{ width: img.naturalWidth * scale, height: img.naturalHeight * scale, transform: `translate(-50%, -50%) translate(${at.x}px, ${at.y}px) rotate(${rot + tilt}deg) scaleX(${flip ? -1 : 1}) scaleY(${flipY ? -1 : 1})`, filter }} />
                <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-40">{Array.from({ length: 9 }).map((_, i) => <span key={i} className="border border-white/50" />)}</div>
              </div>
            )}
          </div>
          <p className="mt-2 text-center text-xs text-muted">Drag to move · wheel or slider to zoom</p>

          <div className="mt-4 flex items-center gap-3">
            <ZoomIn size={16} className="text-fg2" />
            <input type="range" min="1" max="4" step="0.01" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Zoom" className="flex-1 accent-[#1F4FD8]" />
            <button type="button" onClick={() => { setRot((v) => (v + 90) % 360); setPos({ x: 0, y: 0 }); }} aria-label="Rotate" className="grid size-9 place-items-center rounded-full border border-line text-fg2 hover:border-accent hover:text-accent"><RotateCw size={16} /></button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button type="button" onClick={() => { setRot((v) => (v + 270) % 360); setPos({ x: 0, y: 0 }); }} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-fg2 hover:border-accent hover:text-accent"><RotateCcw size={13} /> Turn left</button>
            <button type="button" onClick={() => setFlip((f) => !f)} aria-pressed={flip} className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition', flip ? 'border-accent bg-accent text-white' : 'border-line text-fg2 hover:border-accent hover:text-accent')}><FlipHorizontal2 size={13} /> Mirror</button>
            <button type="button" onClick={() => setFlipY((f) => !f)} aria-pressed={flipY} className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition', flipY ? 'border-accent bg-accent text-white' : 'border-line text-fg2 hover:border-accent hover:text-accent')}><FlipVertical2 size={13} /> Upside down</button>
            <button type="button" onClick={() => { setZoom(1); setRot(0); setTilt(0); setFlip(false); setFlipY(false); setPos({ x: 0, y: 0 }); setLook({ b: 100, c: 100, s: 100, name: 'Original' }); }} className="ml-auto text-xs font-semibold text-tech hover:underline">Reset</button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">Look</span>
            {LOOKS.map(([name, b, c, s2]) => (
              <button key={name} type="button" onClick={() => setLook({ b, c, s: s2, name })} className={cn('rounded-full border px-3 py-1 text-xs transition', look.name === name ? 'border-accent bg-accent text-white' : 'border-line text-fg2 hover:border-accent')}>{name}</button>
            ))}
          </div>
          <label className="mt-3 flex items-center gap-3 text-xs text-fg2"><span className="w-20">Straighten</span>
            <input type="range" min="-15" max="15" step="0.5" value={tilt} onChange={(e) => setTilt(Number(e.target.value))} aria-label="Straighten" className="flex-1 accent-[#1F4FD8]" />
            <span className="w-12 text-right font-mono tabular-nums">{tilt}°</span></label>
          <div className="mt-3 grid gap-2 text-xs text-fg2">
            {[['Brightness', 'b', 60, 150], ['Contrast', 'c', 60, 160], ['Colour', 's', 0, 200]].map(([label, k, lo, hi]) => (
              <label key={k} className="flex items-center gap-3"><span className="w-20">{label}</span>
                <input type="range" min={lo} max={hi} value={look[k]} onChange={(e) => setLook((l) => ({ ...l, [k]: Number(e.target.value), name: '' }))} aria-label={label} className="flex-1 accent-[#1F4FD8]" /></label>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">Shape</span>
            {SHAPES.map(([label, w, h]) => (
              <button key={label} type="button" disabled={!!aspect} onClick={() => pickShape(w, h)}
                className={cn('rounded-full border px-3 py-1 text-xs transition disabled:opacity-40', ratio != null && Math.abs(r - w / h) < 0.01 ? 'border-accent bg-accent text-white' : 'border-line text-fg2 hover:border-accent')}>{label}</button>
            ))}
            {!aspect && <button type="button" onClick={() => { setRatio(null); setPos({ x: 0, y: 0 }); }} className={cn('rounded-full border px-3 py-1 text-xs transition', ratio == null ? 'border-accent bg-accent text-white' : 'border-line text-fg2 hover:border-accent')}>Original</button>}
          </div>
          {!aspect && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-fg2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted">Custom shape</span>
              <input type="number" min="1" max="50" value={shapeW} onChange={(e) => { const v = Number(e.target.value); if (v > 0) pickShape(v, shapeH); }} aria-label="Shape width" className="w-16 rounded-lg border border-line bg-surface px-2 py-1 text-fg tabular-nums" />
              <span className="text-muted">:</span>
              <input type="number" min="1" max="50" value={shapeH} onChange={(e) => { const v = Number(e.target.value); if (v > 0) pickShape(shapeW, v); }} aria-label="Shape height" className="w-16 rounded-lg border border-line bg-surface px-2 py-1 text-fg tabular-nums" />
              <span className="text-muted">(for example 5 : 2)</span>
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">Size</span>
            {SIZES.map(([label, v]) => (
              <button key={label} type="button" onClick={() => setSize(v)} className={cn('rounded-full border px-3 py-1 text-xs transition', size === v ? 'border-accent bg-accent text-white' : 'border-line text-fg2 hover:border-accent')}>{label} · {v}px</button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-fg2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">Exact</span>
            <label className="inline-flex items-center gap-1.5">Width
              <input type="number" min="1" max={MAX_SIDE} value={out.w} onChange={(e) => setWidth(Number(e.target.value))} aria-label="Output width in pixels" className="w-20 rounded-lg border border-line bg-surface px-2 py-1 text-fg tabular-nums" />px</label>
            <span className="text-muted">×</span>
            <label className="inline-flex items-center gap-1.5">Height
              <input type="number" min="1" max={MAX_SIDE} value={out.h} onChange={(e) => setHeight(Number(e.target.value))} aria-label="Output height in pixels" className="w-20 rounded-lg border border-line bg-surface px-2 py-1 text-fg tabular-nums" />px</label>
          </div>
          <label className="mt-3 flex items-center gap-3 text-xs text-fg2"><span className="font-mono text-[10px] uppercase tracking-wider text-muted">Quality</span>
            <input type="range" min="0.5" max="1" step="0.05" value={q} onChange={(e) => setQ(Number(e.target.value))} aria-label="Picture quality" className="flex-1 accent-[#1F4FD8]" />
            <span className="w-12 text-right font-mono tabular-nums">{Math.round(q * 100)}%</span></label>
          <p className="mt-3 text-center text-[11px] text-muted">Final picture: {out.w} × {out.h} px · {keepPng ? 'WebP / PNG' : 'WebP / JPEG'}</p>
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
