import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useI18n, type Lang } from '../../i18n';
import type { ThemePreference } from '../../hooks/useTheme';

const segmentClass = (active: boolean) => cn(
  "px-2 py-1 text-[10px] font-mono uppercase font-bold transition-colors flex items-center gap-1",
  active ? "bg-ink text-paper" : "bg-white text-zinc-600 hover:bg-zinc-100"
);

function LanguageToggle() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="flex border border-ink" role="group" aria-label={t('app.language')}>
      {(['es', 'en'] as Lang[]).map(l => (
        <button key={l} onClick={() => setLang(l)} className={segmentClass(lang === l)} aria-pressed={lang === l}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

const THEME_OPTIONS: { value: ThemePreference; icon: typeof Sun; key: 'theme.light' | 'theme.dark' | 'theme.system' }[] = [
  { value: 'light', icon: Sun, key: 'theme.light' },
  { value: 'dark', icon: Moon, key: 'theme.dark' },
  { value: 'system', icon: Monitor, key: 'theme.system' },
];

function ThemeToggle({ preference, onChange }: { preference: ThemePreference; onChange: (p: ThemePreference) => void }) {
  const { t } = useI18n();
  return (
    <div className="flex border border-ink" role="group" aria-label={t('theme.label')}>
      {THEME_OPTIONS.map(({ value, icon: Icon, key }) => (
        <button key={value} onClick={() => onChange(value)} className={segmentClass(preference === value)} aria-pressed={preference === value} title={t(key)}>
          <Icon size={12} />
          <span className="sr-only">{t(key)}</span>
        </button>
      ))}
    </div>
  );
}

export function AppHeader({ onShowMethodology, theme, onThemeChange }: {
  onShowMethodology: () => void;
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap justify-between items-end gap-4 mb-6 print:hidden">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tighter">QUANT<span className="text-zinc-400">/</span>CORE</h1>
        <p className="text-[10px] sm:text-xs font-mono uppercase text-zinc-500 mt-1">{t('app.subtitle')}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <LanguageToggle />
        <ThemeToggle preference={theme} onChange={onThemeChange} />
        <button
          onClick={onShowMethodology}
          className="flex items-center gap-2 bg-ink text-paper px-3 sm:px-4 py-2 text-xs font-mono uppercase font-bold hover:bg-zinc-800 transition-colors"
        >
          {t('app.methodology')}
        </button>
      </div>
    </div>
  );
}
