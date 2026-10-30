import { ChevronDown, ChevronRight, Info } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts';
import { useI18n, type MessageKey } from '../../i18n';
import { useCollapsible } from '../../hooks/useUiState';
import type { AssetMetadata, QuantStats } from '../../types';

type SizeFactor = 'Large Cap' | 'Mid Cap' | 'Small Cap' | 'Broad Market' | 'Unclassified';
type StyleFactor = 'Value' | 'Blend' | 'Growth' | 'Unclassified';

const SIZE_COLORS: Record<SizeFactor, string> = { 'Large Cap': '#1E293B', 'Mid Cap': '#64748B', 'Small Cap': '#CBD5E1', 'Broad Market': '#94A3B8', 'Unclassified': '#F1F5F9' };
const STYLE_COLORS: Record<StyleFactor, string> = { 'Value': '#166534', 'Blend': '#22C55E', 'Growth': '#86EFAC', 'Unclassified': '#F0FDF4' };

const isFund = (meta: Partial<AssetMetadata>) => meta.quoteTypeStr === 'ETF' || meta.quoteTypeStr === 'MUTUALFUND' || meta.sector === 'ETF / Fondo';

/** Size by market cap (or fund assets): >10B large, 2-10B mid, below small. */
function classifySize(meta: Partial<AssetMetadata>): SizeFactor {
  const cap = meta.marketCap || meta.totalAssets;
  if (cap) return cap > 10e9 ? 'Large Cap' : cap >= 2e9 ? 'Mid Cap' : 'Small Cap';
  return isFund(meta) ? 'Broad Market' : 'Unclassified';
}

/** Style by P/E (<15 value, >25 growth), else P/B (<2 value, >5 growth), else the fund category name. */
function classifyStyle(meta: Partial<AssetMetadata>, pe: number | null): StyleFactor {
  if (pe) return pe < 15 ? 'Value' : pe > 25 ? 'Growth' : 'Blend';
  if (meta.priceToBook) return meta.priceToBook < 2 ? 'Value' : meta.priceToBook > 5 ? 'Growth' : 'Blend';
  if (isFund(meta)) {
    const category = (meta.categoryName || meta.sector || '').toLowerCase();
    if (category.includes('value')) return 'Value';
    if (category.includes('growth')) return 'Growth';
    if (category.includes('blend')) return 'Blend';
    return 'Unclassified';
  }
  return 'Blend'; // Equities without P/E or P/B
}

function ExposurePie<K extends string>({ title, exposure, colors }: { title: string; exposure: Record<K, number>; colors: Record<K, string> }) {
  const { t, f } = useI18n();
  const data = (Object.entries(exposure) as [K, number][])
    .filter(([, value]) => value > 0.001)
    .map(([key, value]) => ({ key, label: t(`factor.${key}` as MessageKey), value }));

  return (
    <div className="flex flex-col h-[250px]">
      <h4 className="text-xs font-bold text-center uppercase mb-2 tracking-widest text-zinc-600">{title}</h4>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            nameKey="label"
            labelLine={false}
            isAnimationActive={false}
            label={({ cx, cy, midAngle, outerRadius, percent, name }) => {
              if (percent <= 0.05) return null;
              const radius = outerRadius * 1.25;
              const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
              const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
              const text = `${name} ${f.pct(percent, 0)}`;
              const anchor = x > cx ? 'start' : 'end';
              return (
                <g>
                  {/* Halo in the background color keeps the label readable over the slices */}
                  <text x={x} y={y} fill="none" stroke="var(--color-white)" strokeWidth={3} textAnchor={anchor} dominantBaseline="central" fontSize={11} fontWeight="600">{text}</text>
                  <text x={x} y={y} fill="var(--color-ink)" textAnchor={anchor} dominantBaseline="central" fontSize={11} fontWeight="600">{text}</text>
                </g>
              );
            }}
          >
            {data.map(entry => (
              <Cell key={entry.key} fill={colors[entry.key]} />
            ))}
          </Pie>
          <RechartsTooltip formatter={(value: number) => f.pct(value)} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FactorInvestingWidget({ metadata, quantStats }: { metadata: AssetMetadata[]; quantStats: QuantStats }) {
  const { t, f } = useI18n();
  const [open, toggle] = useCollapsible('factorInvesting', true);
  if (!quantStats.optimization) return null;

  const weights = quantStats.optimization.optimal.weights;
  const sizeExposure: Record<SizeFactor, number> = { 'Large Cap': 0, 'Mid Cap': 0, 'Small Cap': 0, 'Broad Market': 0, 'Unclassified': 0 };
  const styleExposure: Record<StyleFactor, number> = { 'Value': 0, 'Blend': 0, 'Growth': 0, 'Unclassified': 0 };

  const assets = quantStats.matrixSymbols.map((sym, i) => {
    const meta: Partial<AssetMetadata> = metadata.find(m => m.symbol === sym) || {};
    const pe = meta.trailingPE || meta.forwardPE || null;
    const size = classifySize(meta);
    const style = classifyStyle(meta, pe);
    sizeExposure[size] += weights[i];
    styleExposure[style] += weights[i];
    return { symbol: sym, weight: weights[i], meta, pe, size, style };
  });

  const td = "p-2 border-r border-zinc-200 whitespace-nowrap";
  const th = "p-2 border-r border-zinc-700 whitespace-nowrap";

  return (
    <div className="flex flex-col border border-ink bg-white h-full">
      <button
        onClick={toggle}
        aria-expanded={open}
        className="flex justify-between items-center p-3 w-full text-left bg-zinc-50 border-b border-ink hover:bg-zinc-100 transition-colors"
      >
        <h3 className="text-xs font-mono uppercase bg-ink text-paper px-2 py-0.5 inline-flex items-center gap-2">
          <span>{t('factor.title')}</span>
        </h3>
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>

      {open && (
        <div className="p-4 flex flex-col gap-6">
          <div className="flex bg-blue-50 p-3 border border-blue-100 text-xs text-blue-800 gap-2 items-start">
            <Info size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold mb-1">{t('factor.theoryTitle')}</p>
              <p>{t('factor.theory')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ExposurePie title={t('factor.size')} exposure={sizeExposure} colors={SIZE_COLORS} />
            <ExposurePie title={t('factor.style')} exposure={styleExposure} colors={STYLE_COLORS} />
          </div>

          <div className="overflow-x-auto border border-ink mt-4">
            <table className="w-full text-xs text-left text-ink">
              <thead className="bg-ink text-paper uppercase tracking-wider font-mono text-[10px]">
                <tr>
                  <th className={th}>{t('col.asset')}</th>
                  <th className={th}>{t('col.weight')}</th>
                  <th className={`${th} text-right`}>{t('factor.marketCap')}</th>
                  <th className={`${th} text-right`}>{t('factor.pe')}</th>
                  <th className={`${th} text-right`}>{t('factor.pb')}</th>
                  <th className={`${th} text-right`}>{t('factor.roe')}</th>
                  <th className={th}>{t('factor.sizeFactor')}</th>
                  <th className="p-2 whitespace-nowrap">{t('factor.styleFactor')}</th>
                </tr>
              </thead>
              <tbody>
                {assets.map(({ symbol, weight, meta, pe, size, style }) => (
                  <tr key={symbol} className="border-b border-zinc-200 hover:bg-zinc-50">
                    <td className={`${td} font-bold`}>{symbol}</td>
                    <td className={td}>{f.pct(weight, 1)}</td>
                    <td className={`${td} text-right`}>
                      {meta.marketCap ? `$${f.num(meta.marketCap / 1e9, 1)}B` : meta.totalAssets ? `~$${f.num(meta.totalAssets / 1e9, 1)}B` : t('common.na')}
                    </td>
                    <td className={`${td} text-right`}>{pe ? f.num(pe) : t('common.na')}</td>
                    <td className={`${td} text-right`}>{meta.priceToBook ? f.num(meta.priceToBook) : t('common.na')}</td>
                    <td className={`${td} text-right`}>{meta.returnOnEquity ? f.pct(meta.returnOnEquity, 1) : t('common.na')}</td>
                    <td className={td}>{t(`factor.${size}` as MessageKey)}</td>
                    <td className="p-2 whitespace-nowrap">{t(`factor.${style}` as MessageKey)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
