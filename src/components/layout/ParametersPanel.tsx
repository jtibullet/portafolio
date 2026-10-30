import { useState } from 'react';
import { Loader2, Play } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useI18n } from '../../i18n';
import { useCollapsible } from '../../hooks/useUiState';
import { BENCHMARKS, DEFAULT_MAX_WEIGHT, defaultMinWeight, HORIZON_OPTIONS, MAX_ASSETS, POPULAR_TICKERS } from '../../constants';
import type { PortfolioParamsControls } from '../../hooks/usePortfolioParams';
import type { WeightBounds } from '../../types';

const labelClass = "block text-[10px] uppercase tracking-wider text-zinc-500 font-bold";

function TickerPicker({ controls }: { controls: PortfolioParamsControls }) {
  const { t } = useI18n();
  const { params: { selectedTickers }, setSelectedTickers, addTicker, removeTicker } = controls;
  const [customTicker, setCustomTicker] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const atLimit = selectedTickers.length >= MAX_ASSETS;

  const filteredTickers = POPULAR_TICKERS.filter(tk =>
    tk.symbol.toLowerCase().includes(customTicker.toLowerCase()) ||
    tk.name.toLowerCase().includes(customTicker.toLowerCase())
  ).slice(0, 8);

  const handleAdd = (ticker?: string) => {
    const result = addTicker(ticker || customTicker);
    if (result === 'limit') {
      alert(t('params.limitReached', { max: MAX_ASSETS }));
    } else if (result === 'added') {
      setCustomTicker('');
      setShowSuggestions(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className={labelClass}>{t('params.assets', { max: MAX_ASSETS })}</label>
      <div className="flex flex-wrap items-center gap-1 mb-2">
        {selectedTickers.map(ticker => (
          <button
            key={ticker}
            onClick={() => removeTicker(ticker)}
            className="px-2 py-1 bg-zinc-200 hover:bg-red-100 hover:text-red-700 hover:border-red-300 text-ink border border-zinc-300 rounded-sm text-[10px] font-mono inline-flex items-center transition-colors"
            title={t('params.removeHint')}
          >
            {ticker}
            <span className="ml-1.5 opacity-50">&times;</span>
          </button>
        ))}
        {selectedTickers.length > 0 && (
          <button
            onClick={() => setSelectedTickers([])}
            className="ml-2 text-[9px] text-zinc-500 hover:text-red-600 uppercase font-bold underline"
          >
            {t('params.clearAll')}
          </button>
        )}
      </div>
      <div className="flex gap-2 relative">
        <div className="flex-1 relative">
          <input
            type="text"
            value={customTicker}
            onChange={(e) => {
              setCustomTicker(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
            }}
            placeholder={t('params.addPlaceholder')}
            autoCapitalize="characters"
            className="w-full bg-zinc-50 text-sm sm:text-xs border border-zinc-300 focus:border-ink focus:outline-none p-2 rounded-sm"
            disabled={atLimit}
          />
          {showSuggestions && customTicker && filteredTickers.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-300 shadow-lg z-50 rounded-sm overflow-hidden">
              {filteredTickers.map(tk => (
                <div
                  key={tk.symbol}
                  className="px-3 py-2 text-xs hover:bg-zinc-100 cursor-pointer flex justify-between items-center"
                  onClick={() => handleAdd(tk.symbol)}
                >
                  <span className="font-bold text-ink">{tk.symbol}</span>
                  <span className="text-zinc-500 font-serif italic truncate ml-2">{tk.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => handleAdd()}
          disabled={atLimit}
          className="px-3 py-2 bg-ink hover:bg-zinc-800 text-paper rounded-sm text-[10px] uppercase font-bold disabled:opacity-50 shrink-0"
        >
          {t('params.add')}
        </button>
      </div>
    </div>
  );
}


const maxOf = (bounds: WeightBounds, tk: string) => bounds[tk] !== undefined ? bounds[tk] : DEFAULT_MAX_WEIGHT;

function ConcentrationLimits({ controls }: { controls: PortfolioParamsControls }) {
  const { t, f } = useI18n();
  const { params: { selectedTickers, minWeights, maxWeights }, setMinWeights, setMaxWeights } = controls;
  const defaultMin = defaultMinWeight(selectedTickers.length);
  const minOf = (bounds: WeightBounds, tk: string) => bounds[tk] !== undefined ? bounds[tk] : defaultMin;

  /** Sets the same min (or max) for every ticker, pushing the opposite bound so min <= max holds. */
  const applyGlobal = (kind: 'min' | 'max', value: string) => {
    if (!value) return;
    const val = Number(value) / 100;
    const newMin: WeightBounds = { ...minWeights };
    const newMax: WeightBounds = { ...maxWeights };
    selectedTickers.forEach(tk => {
      if (kind === 'min') {
        newMin[tk] = val;
        if (maxOf(newMax, tk) < val) newMax[tk] = val;
      } else {
        newMax[tk] = val;
        if (minOf(newMin, tk) > val) newMin[tk] = val;
      }
    });
    setMinWeights(newMin);
    setMaxWeights(newMax);
  };

  const reset = () => {
    const newMax: WeightBounds = {};
    const newMin: WeightBounds = {};
    selectedTickers.forEach(tk => {
      newMax[tk] = DEFAULT_MAX_WEIGHT;
      newMin[tk] = defaultMin;
    });
    setMaxWeights(newMax);
    setMinWeights(newMin);
  };

  return (
    <div className="pt-4 border-t border-zinc-200 mt-2">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">{t('params.limits')}</h4>
        <div className="flex flex-wrap items-center gap-4 bg-zinc-50 p-2 border border-zinc-200 rounded-sm">
          <div className="flex items-center gap-2">
            <label className="text-[9px] font-mono text-zinc-500">{t('params.globalMin')}</label>
            <input
              type="number"
              inputMode="decimal"
              min="0" max="100" step="1"
              placeholder={f.num(defaultMin * 100, 0)}
              className="w-16 p-1 text-xs font-mono border border-zinc-300 bg-white"
              onBlur={(e) => applyGlobal('min', e.target.value)}
            />
            <span className="text-[9px] font-mono">%</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[9px] font-mono text-zinc-500">{t('params.globalMax')}</label>
            <input
              type="number"
              inputMode="decimal"
              min="0" max="100" step="1"
              placeholder="20"
              className="w-16 p-1 text-xs font-mono border border-zinc-300 bg-white"
              onBlur={(e) => applyGlobal('max', e.target.value)}
            />
            <span className="text-[9px] font-mono">%</span>
          </div>
          <button
            className="text-[9px] uppercase tracking-wider text-zinc-600 hover:underline px-2 border-l border-zinc-300"
            onClick={reset}
          >
            {t('params.reset')}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
        {selectedTickers.map(ticker => (
          <div key={ticker} className="flex flex-col gap-2 p-2 bg-zinc-50 border border-zinc-200">
            <div className="text-[10px] font-bold text-center border-b border-zinc-200 pb-1">{ticker}</div>

            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-mono text-zinc-500 flex justify-between">
                <span>{t('params.min')}</span>
                <span>{f.pct(minOf(minWeights, ticker), 0)}</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={minOf(minWeights, ticker) * 100}
                onChange={(e) => {
                  const newMin = Number(e.target.value) / 100;
                  setMinWeights({ ...minWeights, [ticker]: newMin });
                  if (newMin > maxOf(maxWeights, ticker)) setMaxWeights({ ...maxWeights, [ticker]: newMin });
                }}
                className="w-full accent-blue-600"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-mono text-zinc-500 flex justify-between">
                <span>{t('params.max')}</span>
                <span>{f.pct(maxOf(maxWeights, ticker), 0)}</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={maxOf(maxWeights, ticker) * 100}
                onChange={(e) => {
                  const newMax = Number(e.target.value) / 100;
                  setMaxWeights({ ...maxWeights, [ticker]: newMax });
                  if (newMax < minOf(minWeights, ticker)) setMinWeights({ ...minWeights, [ticker]: newMax });
                }}
                className="w-full accent-purple-600"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RunButton({ dataLoading, disabled, onClick, compact = false }: {
  dataLoading: boolean;
  disabled: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  const { t } = useI18n();
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center justify-center gap-2 font-bold uppercase tracking-widest transition-colors disabled:opacity-50",
        compact
          ? "px-4 py-2 text-[10px] bg-paper text-ink hover:bg-white"
          : "w-full sm:w-auto px-8 py-3 text-xs bg-ink text-paper hover:bg-zinc-800"
      )}
    >
      {dataLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-3 h-3" />}
      {dataLoading ? t('params.running') : t('params.run')}
    </button>
  );
}

/**
 * Inputs for the analysis. Open on the first visit; it collapses when the user runs the
 * analysis so the results are visible, and the header bar keeps a Run button at hand.
 */
export function ParametersPanel({ controls, dataLoading, onRun }: {
  controls: PortfolioParamsControls;
  dataLoading: boolean;
  onRun: () => void;
}) {
  const { t, f, years } = useI18n();
  const [open, toggle] = useCollapsible('parameters', true);
  const { params, setSelectedBenchmark, setHorizonYears, setRiskFreeRate, setUseArimaForecast } = controls;
  const runDisabled = dataLoading || params.selectedTickers.length === 0;

  const run = () => {
    onRun();
    if (open) toggle();
  };

  return (
    <div className="mb-6 flex flex-col border border-ink bg-white print:hidden">
      <div className="flex items-stretch bg-ink text-paper">
        <button
          onClick={toggle}
          aria-expanded={open}
          className="flex-1 flex justify-between items-center gap-2 p-3 text-xs font-mono uppercase text-left hover:bg-zinc-800 transition-colors"
        >
          <span>{t('params.title')}</span>
          <span>{open ? '[-]' : '[+]'}</span>
        </button>
        {!open && (
          <div className="flex items-center px-2 border-l border-zinc-700">
            <RunButton compact dataLoading={dataLoading} disabled={runDisabled} onClick={run} />
          </div>
        )}
      </div>

      {open && (
        <div className="p-4 sm:p-6 bg-white flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <TickerPicker controls={controls} />

            <div className="space-y-2">
              <label className={labelClass}>{t('params.benchmark')}</label>
              <select
                value={params.selectedBenchmark}
                onChange={(e) => setSelectedBenchmark(e.target.value)}
                className="w-full bg-zinc-50 p-2 text-sm sm:text-xs border border-zinc-300 font-mono text-ink focus:outline-none focus:border-ink rounded-sm"
              >
                {BENCHMARKS.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className={labelClass}>{t('params.horizon')}</label>
              <div className="flex border border-zinc-300 overflow-hidden rounded-sm">
                {HORIZON_OPTIONS.map((opt, i) => (
                  <button
                    key={opt.value}
                    onClick={() => setHorizonYears(opt.value)}
                    className={cn(
                      "flex-1 py-2 text-[10px] font-bold uppercase transition-colors",
                      params.horizonYears === opt.value ? "bg-ink text-paper" : "bg-zinc-50 hover:bg-zinc-200 text-ink",
                      i > 0 && "border-l border-zinc-300"
                    )}
                  >
                    {years(opt.value)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className={labelClass}>{t('params.riskFree')}</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={params.riskFreeRate * 100}
                  onChange={(e) => setRiskFreeRate(Number(e.target.value) / 100)}
                  className="flex-1 accent-ink"
                />
                <span className="text-xs font-mono w-12 text-right">{f.pct(params.riskFreeRate, 1)}</span>
              </div>
            </div>
          </div>

          <ConcentrationLimits controls={controls} />

          <div className="pt-4 border-t border-zinc-200 mt-2 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
            <label htmlFor="useArima" className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 p-2 px-4 rounded-sm cursor-pointer">
              <input
                type="checkbox"
                id="useArima"
                checked={params.useArimaForecast}
                onChange={(e) => setUseArimaForecast(e.target.checked)}
                className="accent-ink w-4 h-4 cursor-pointer shrink-0"
              />
              <span className="text-[10px] uppercase tracking-wider text-ink font-bold">{t('params.arima')}</span>
            </label>
            <RunButton dataLoading={dataLoading} disabled={runDisabled} onClick={run} />
          </div>
        </div>
      )}
    </div>
  );
}
