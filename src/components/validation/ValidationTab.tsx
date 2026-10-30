import { useI18n } from '../../i18n';
import { SectionHeader } from '../ui/SectionTitle';
import type { AssetMetadata, PriceRow } from '../../types';

const th = "p-2 text-[10px] font-serif italic border-r border-zinc-200";
const tableWrapper = "bg-white border border-ink overflow-hidden overflow-x-auto p-0";
/** Symbols whose Yahoo ticker refers to a US-listed ADR rather than the local Santiago listing (or vice versa). */
const CROSS_MARKET_SYMBOLS = ['BCH', 'BSAC', 'ENIC', 'SQM', 'SQM-B', 'CHILE.SN', 'BSANTANDER.SN', 'ENELCHILE.SN', 'SQM-B.SN'];

function TickerDictionary({ selectedTickers, metadata, metadataLoading }: {
  selectedTickers: string[];
  metadata: AssetMetadata[] | null;
  metadataLoading: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col">
      <SectionHeader title={t('val.dictTitle')} />
      <div className={tableWrapper}>
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead className="bg-white shadow-sm z-10">
            <tr className="border-b border-ink bg-panel">
              <th className={th}>{t('val.nameDesc')}</th>
              <th className={th}>{t('val.racional')}</th>
              <th className={th}>{t('val.yahoo')}</th>
              <th className="p-2 text-[10px] font-serif italic">{t('val.lseg')}</th>
            </tr>
          </thead>
          <tbody className="font-mono text-[11px]">
            {selectedTickers.length > 0 ? selectedTickers.map((sym, i) => {
              const meta = metadata?.find(m => m.symbol === sym);
              return (
                <tr key={`dict-${sym}-${i}`} className="border-b border-zinc-100 hover:bg-zinc-50">
                  <td className="p-2 border-r border-zinc-200 font-bold whitespace-normal min-w-[200px]">{meta ? meta.nameAndDesc : (metadataLoading ? t('common.loading') : t('common.na'))}</td>
                  <td className="p-2 border-r border-zinc-200">{meta ? meta.racionalTicker : sym}</td>
                  <td className="p-2 border-r border-zinc-200">{meta ? meta.yahooTicker : sym}</td>
                  <td className="p-2">{meta ? meta.lsegTicker : sym}</td>
                </tr>
              );
            }) : (
              <tr><td colSpan={4} className="p-4 text-center text-zinc-500 italic">{t('val.noTickers')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedTickers.some(sym => CROSS_MARKET_SYMBOLS.includes(sym)) && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 p-3 text-yellow-800 text-xs font-mono">
          <strong>{t('val.noteLabel')}</strong> {t('val.crossMarket')}
        </div>
      )}
    </div>
  );
}

function AssetDescriptions({ symbols, metadata }: { symbols: string[]; metadata: AssetMetadata[] | null }) {
  const { t, sector } = useI18n();
  return (
    <div className="flex flex-col">
      <SectionHeader title={t('val.descTitle')} />
      <div className={tableWrapper}>
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead className="bg-white shadow-sm z-10">
            <tr className="border-b border-ink bg-panel">
              <th className={th}>{t('col.ticker')}</th>
              <th className={th}>{t('val.nameDesc')}</th>
              <th className={th}>{t('val.sector')}</th>
            </tr>
          </thead>
          <tbody className="font-mono text-[11px]">
            {symbols.map(sym => {
              const meta = metadata?.find(m => m.symbol === sym);
              return (
                <tr key={`meta-${sym}`} className="border-b border-zinc-100 hover:bg-zinc-50">
                  <td className="p-2 border-r border-zinc-200 font-bold">{sym}</td>
                  <td className="p-2 border-r border-zinc-200 whitespace-normal min-w-[240px]">{meta?.nameAndDesc || t('common.na')}</td>
                  <td className="p-2 border-r border-zinc-200">{meta?.sector ? sector(meta.sector) : t('common.na')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Scrollable date x symbol table, newest first. */
function DailyTable({ title, symbols, rows, cell }: {
  title: string;
  symbols: string[];
  rows: { date: string; index: number }[];
  cell: (index: number, sym: string) => string;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col">
      <SectionHeader title={title} />
      <div className={`${tableWrapper} max-h-[500px]`}>
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead className="sticky top-0 bg-white shadow-sm z-10">
            <tr className="border-b border-ink bg-panel">
              <th className={th}>{t('val.date')}</th>
              {symbols.map(sym => (
                <th key={sym} className={`${th} text-right`}>{sym}</th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono text-[11px]">
            {rows.map(({ date, index }) => (
              <tr key={`${title}-${date}`} className="border-b border-zinc-100 hover:bg-zinc-50">
                <td className="p-2 border-r border-zinc-200 text-zinc-500">{date}</td>
                {symbols.map(sym => (
                  <td key={`${date}-${sym}`} className="p-2 border-r border-zinc-200 text-right text-ink">{cell(index, sym)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ValidationTab({ selectedTickers, symbols, metadata, metadataLoading, historicalData }: {
  selectedTickers: string[];
  symbols: string[];
  metadata: AssetMetadata[] | null;
  metadataLoading: boolean;
  historicalData: PriceRow[];
}) {
  const { t, f } = useI18n();
  const price = (i: number, sym: string) => historicalData[i][sym] as number | null;
  const newestFirst = historicalData.map((row, index) => ({ date: row.date, index })).reverse();

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="bg-panel border border-ink border-l-4 border-l-blue-600 p-4 text-ink text-sm font-serif italic">
        <strong>{t('val.noteLabel')}</strong> {t('val.note')}
      </div>

      <TickerDictionary selectedTickers={selectedTickers} metadata={metadata} metadataLoading={metadataLoading} />
      <AssetDescriptions symbols={symbols} metadata={metadata} />

      <DailyTable
        title={t('val.pricesTitle')}
        symbols={symbols}
        rows={newestFirst}
        cell={(i, sym) => { const p = price(i, sym); return p ? f.num(p, 4) : t('common.na'); }}
      />
      <DailyTable
        title={t('val.returnsTitle')}
        symbols={symbols}
        rows={newestFirst.filter(r => r.index > 0)}
        cell={(i, sym) => {
          const current = price(i, sym);
          const previous = price(i - 1, sym);
          return current && previous ? f.pct(Math.log(current / previous), 4) : t('common.na');
        }}
      />
    </div>
  );
}
