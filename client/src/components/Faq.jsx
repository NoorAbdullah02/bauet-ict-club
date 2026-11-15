import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../context/store';
import Newsletter from './Newsletter';
import { cn } from '../lib/cn';
import EmptyState from './EmptyState';

export default function Faq() {
  const faqs = useStore(useShallow((s) => s.faqs)) || [];
  const [open, setOpen] = useState(0);

  // FAQ structured data lets search engines show the answers directly
  useEffect(() => {
    if (!faqs.length) return undefined;
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.text = JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })) });
    document.head.appendChild(el);
    return () => el.remove();
  }, [faqs]);

  return (
    <section className="section">
      <div className="container max-w-3xl">
        <div className="section-header">
          <div className="section-tag">Questions</div>
          <h2 className="section-title">Frequently asked</h2>
          <p className="section-desc">Quick answers about joining and the club. Still stuck? <Link to="/contact" className="text-accent">Contact us</Link>.</p>
          <div className="divider" />
        </div>

        <div className="space-y-3">
          {faqs.length === 0 && <EmptyState icon={HelpCircle} title="No questions yet" hint="Answers to common questions will be added here. Until then, the Contact page reaches us directly." />}
          {faqs.map((f, i) => (
            <div key={f.id} className={cn('rounded-2xl border bg-surface transition-colors', open === i ? 'border-tech/50 shadow-[var(--shadow-md)]' : 'border-line')}>
              <button type="button" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-display text-lg text-fg">
                <span>{f.question}</span>
                <ChevronDown size={18} className={cn('shrink-0 text-muted transition-transform duration-300', open === i && 'rotate-180 text-tech')} />
              </button>
              <div className={cn('grid transition-all duration-300', open === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                <div className="overflow-hidden"><p className="px-5 pb-5 text-sm leading-7 text-fg2">{f.answer}</p></div>
              </div>
            </div>
          ))}
        </div>

        <Newsletter className="mt-14 rounded-3xl border border-line bg-surface p-6 sm:p-8" />
      </div>
    </section>
  );
}
