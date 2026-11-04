import { Children, isValidElement, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../lib/cn';

/**
 * Drop-in replacement for <select>: same props (value, onChange(e), className, disabled) and <option> children,
 * but with a styled, keyboard-accessible list. The menu is portalled so it is never clipped by cards or drawers.
 */
export default function Select({ value = '', onChange, children, className, disabled, name, id, 'aria-label': ariaLabel }) {
  const uid = useId();
  const btn = useRef(null);
  const menu = useRef(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [pos, setPos] = useState(null);

  const options = useMemo(() => Children.toArray(children).filter(isValidElement).map((c) => {
    const label = Children.toArray(c.props.children).join('');
    return { value: String(c.props.value ?? label), label, disabled: !!c.props.disabled };
  }), [children]);

  const selected = options.findIndex((o) => o.value === String(value ?? ''));
  const current = selected >= 0 ? options[selected] : null;
  const isPlaceholder = !current || current.value === '';

  const place = useCallback(() => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom;
    const up = below < 260 && r.top > below;
    setPos({ left: r.left, width: r.width, ...(up ? { bottom: window.innerHeight - r.top + 6, maxH: Math.min(300, r.top - 16) } : { top: r.bottom + 6, maxH: Math.min(300, below - 16) }) });
  }, []);

  const close = useCallback((refocus) => { setOpen(false); if (refocus) btn.current?.focus(); }, []);

  const choose = (i) => {
    const o = options[i];
    if (!o || o.disabled) return;
    onChange?.({ target: { value: o.value, name }, currentTarget: { value: o.value, name } });
    close(true);
  };

  useLayoutEffect(() => { if (open) place(); }, [open, place]);

  useEffect(() => {
    if (!open) return;
    setActive(selected >= 0 ? selected : options.findIndex((o) => !o.disabled));
    const away = (e) => { if (!btn.current?.contains(e.target) && !menu.current?.contains(e.target)) close(false); };
    const onScroll = (e) => { if (!menu.current?.contains(e.target)) close(false); };
    document.addEventListener('pointerdown', away);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', place);
    return () => { document.removeEventListener('pointerdown', away); window.removeEventListener('scroll', onScroll, true); window.removeEventListener('resize', place); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { menu.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' }); }, [active, pos]);

  const step = (dir) => {
    let i = active;
    for (let n = 0; n < options.length; n += 1) {
      i = (i + dir + options.length) % options.length;
      if (!options[i].disabled) { setActive(i); return; }
    }
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); setOpen(true); }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); step(-1); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(options.findIndex((o) => !o.disabled)); }
    else if (e.key === 'End') { e.preventDefault(); setActive(options.length - 1 - [...options].reverse().findIndex((o) => !o.disabled)); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active); }
    else if (e.key === 'Escape') { e.preventDefault(); close(true); }
    else if (e.key === 'Tab') close(false);
    else if (e.key.length === 1) {
      const k = e.key.toLowerCase();
      const from = options.findIndex((o, i) => i > active && !o.disabled && o.label.toLowerCase().startsWith(k));
      const i = from >= 0 ? from : options.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(k));
      if (i >= 0) setActive(i);
    }
  };

  return (
    <>
      <button ref={btn} type="button" id={id} disabled={disabled} role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={`${uid}-list`} aria-label={ariaLabel}
        onClick={(e) => { e.preventDefault(); if (!disabled) setOpen((o) => !o); }} onKeyDown={onKeyDown}
        className={cn(className, 'flex cursor-pointer items-center justify-between gap-3 text-left disabled:cursor-not-allowed disabled:opacity-60', open && '!border-tech !ring-4 !ring-tech/15')}>
        <span className={cn('min-w-0 flex-1 truncate', isPlaceholder && 'text-muted')}>{current?.label || ' '}</span>
        <ChevronDown size={16} className={cn('shrink-0 text-muted transition-transform duration-300', open && 'rotate-180 text-tech')} />
      </button>
      {open && pos && createPortal(
        <ul ref={menu} id={`${uid}-list`} role="listbox" data-theme-scope
          style={{ position: 'fixed', left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxH, zIndex: 2000 }}
          className="select-menu overflow-y-auto overscroll-contain rounded-2xl border border-line bg-surface p-1.5 shadow-[var(--shadow-xl)] backdrop-blur-xl">
          {options.map((o, i) => (
            <li key={o.value + i} role="option" aria-selected={i === selected} aria-disabled={o.disabled} data-active={i === active}
              onPointerEnter={() => !o.disabled && setActive(i)} onClick={() => choose(i)}
              className={cn('flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors',
                o.disabled && 'cursor-not-allowed opacity-40',
                i === active && !o.disabled ? 'bg-accent/10 text-fg' : 'text-fg2',
                i === selected && 'font-semibold !text-accent',
                o.value === '' && 'text-muted')}>
              <span className="truncate">{o.label}</span>
              {i === selected && <Check size={15} className="shrink-0 text-tech" />}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </>
  );
}
