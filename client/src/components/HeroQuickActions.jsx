import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { IdCard, Award, UserPlus, Smartphone, ArrowRight, Search } from 'lucide-react';
import { useT } from '../lib/i18n';

export default function HeroQuickActions() {
  const t = useT();
  const nav = useNavigate();
  const [studentId, setStudentId] = useState('');

  const onLookupCard = (e) => {
    e.preventDefault();
    const id = studentId.trim();
    if (id) {
      nav(`/my-card?id=${encodeURIComponent(id)}`);
    } else {
      nav('/my-card');
    }
  };

  return (
    <div className="mx-auto mt-8 max-w-3xl">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div whileHover={{ y: -3 }} className="group relative flex flex-col justify-between rounded-2xl border border-line bg-surface/70 p-4 backdrop-blur-md transition hover:border-accent/50">
          <div>
            <div className="flex size-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <IdCard size={18} />
            </div>
            <h3 className="mt-3 font-display text-sm font-semibold text-fg">{t('Find Member Card')}</h3>
            <p className="mt-1 text-xs text-muted leading-relaxed">{t('Lookup verified club card by Student ID')}</p>
          </div>
          <form onSubmit={onLookupCard} className="mt-3 flex items-center gap-1.5 rounded-lg border border-line bg-bg/70 px-2 py-1 focus-within:border-accent">
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="Student ID..."
              aria-label="Student ID for card search"
              className="min-w-0 flex-1 bg-transparent text-xs text-fg outline-none placeholder:text-muted"
            />
            <button type="submit" aria-label="Search card" className="text-accent hover:text-accent/80">
              <Search size={13} />
            </button>
          </form>
        </motion.div>

        <motion.div whileHover={{ y: -3 }} onClick={() => nav('/verify')} className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-line bg-surface/70 p-4 backdrop-blur-md transition hover:border-tech/50">
          <div>
            <div className="flex size-9 items-center justify-center rounded-xl bg-tech/10 text-tech">
              <Award size={18} />
            </div>
            <h3 className="mt-3 font-display text-sm font-semibold text-fg">{t('Verify Certificate')}</h3>
            <p className="mt-1 text-xs text-muted leading-relaxed">{t('Check authenticity of workshop & contest certificates')}</p>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs font-medium text-tech group-hover:underline">
            <span>{t('Verify now')}</span> <ArrowRight size={13} />
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -3 }} onClick={() => nav('/join')} className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-line bg-surface/70 p-4 backdrop-blur-md transition hover:border-accent/50">
          <div>
            <div className="flex size-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <UserPlus size={18} />
            </div>
            <h3 className="mt-3 font-display text-sm font-semibold text-fg">{t('Join Club')}</h3>
            <p className="mt-1 text-xs text-muted leading-relaxed">{t('Apply for Committee, General, or Ambassador')}</p>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs font-medium text-accent group-hover:underline">
            <span>{t('Apply online')}</span> <ArrowRight size={13} />
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -3 }} onClick={() => nav('/app')} className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-line bg-surface/70 p-4 backdrop-blur-md transition hover:border-tech/50">
          <div>
            <div className="flex size-9 items-center justify-center rounded-xl bg-tech/10 text-tech">
              <Smartphone size={18} />
            </div>
            <h3 className="mt-3 font-display text-sm font-semibold text-fg">{t('Mobile App')}</h3>
            <p className="mt-1 text-xs text-muted leading-relaxed">{t('Download Android APK with offline tickets & card')}</p>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs font-medium text-tech group-hover:underline">
            <span>{t('Get APK')}</span> <ArrowRight size={13} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
