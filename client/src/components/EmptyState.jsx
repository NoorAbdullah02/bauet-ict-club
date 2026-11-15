/** What a list shows when it has nothing yet: a centred card with an icon, a short title and a friendly line. */
export default function EmptyState({ icon: Icon, title, hint, children, className = '' }) {
  return (
    <div className={`mx-auto max-w-md rounded-3xl border border-line bg-surface/80 px-8 py-12 text-center shadow-[var(--shadow-sm)] ${className}`}>
      {Icon && <span className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-tech/10 text-tech"><Icon size={28} aria-hidden="true" /></span>}
      <h3 className="font-display text-xl text-fg">{title}</h3>
      {hint && <p className="mt-2 text-sm leading-6 text-fg2">{hint}</p>}
      {children && <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}
