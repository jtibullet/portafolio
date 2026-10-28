import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useCollapsible } from '../../hooks/useUiState';
import { BENCHMARKS, DEFAULT_MAX_WEIGHT, DEFAULT_MIN_WEIGHT, HORIZON_OPTIONS, MAX_ASSETS, POPULAR_TICKERS } from '../../constants';
import type { PortfolioParamsControls } from '../../hooks/usePortfolioParams';
import type { WeightBounds } from '../../types';

const labelClass = "block text-[10px] uppercase tracking-wider text-zinc-500 font-bold";

function TickerPicker({ controls }: { controls: PortfolioParamsControls }) {
  const { params: { selectedTickers }, setSelectedTickers, addTicker, removeTicker } = controls;
  const [customTicker, setCustomTicker] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const atLimit = selectedTickers.length >= MAX_ASSETS;

  const filteredTickers = POPULAR_TICKERS.filter(t =>
    t.symbol.toLowerCase().includes(customTicker.toLowerCase()) ||
    t.name.toLowerCase().includes(customTicker.toLowerCase())
  ).slice(0, 8);

  const handleAdd = (ticker?: string) => {
    const result = addTicker(ticker || customTicker);
    if (result === 'limit') {
      alert(`Maximum of ${MAX_ASSETS} assets allowed.`);
    } else if (result === 'added') {
      setCustomTicker('');
      setShowSuggestions(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className={labelClass}>Select Assets (Up to {MAX_ASSETS})</label>
      <div className="flex flex-wrap items-center gap-1 mb-2">
        {selectedTickers.map(ticker => (
          <span
            key={ticker}
            onClick={() => removeTicker(ticker)}
            className="cursor-pointer px-2 py-0.5 bg-zinc-200 hover:bg-red-100 hover:text-red-700 hover:border-red-300 text-[#141414] border border-zinc-300 rounded-sm text-[9px] font-mono inline-flex items-center transition-colors"
            title="Click to remove"
          >
            {ticker}
            <span className="ml-1.5 opacity-50">&times;</span>
          </span>
        ))}
        {selectedTickers.length > 0 && (
          <button
            onClick={() => setSelectedTickers([])}
            className="ml-2 text-[9px] text-zinc-500 hover:text-red-600 uppercase font-bold underline"
          >
            Clear All
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
            placeholder="Add ticker... (e.g. AAPL)"
            className="w-full bg-zinc-50 text-xs border border-zinc-300 focus:border-[#141414] focus:outline-none p-2 rounded-sm"
            disabled={atLimit}
          />
          {showSuggestions && customTicker && filteredTickers.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-300 shadow-lg z-50 rounded-sm overflow-hidden">
              {filteredTickers.map(t => (
                <div
                  key={t.symbol}
                  className="px-3 py-2 text-xs hover:bg-zinc-100 cursor-pointer flex justify-between items-center"
                  onClick={() => handleAdd(t.symbol)}
                >
                  <span className="font-bold text-[#141414]">{t.symbol}</span>
                  <span className="text-zinc-500 font-serif italic truncate ml-2">{t.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => handleAdd()}
          disabled={atLimit}
          className="px-3 py-2 bg-[#141414] hover:bg-zinc-800 text-[#E4E3E0] rounded-sm text-[10px] uppercase font-bold disabled:opacity-50 shrink-0"
        >
          Add
        </button>
      </div>
    </div>
  );
}

const minOf = (bounds: WeightBounds, t: string) => bounds[t] !== undefined ? bounds[t] : DEFAULT_MIN_WEIGHT;
const maxOf = (bounds: WeightBounds, t: string) => bounds[t] !== undefined ? bounds[t] : DEFAULT_MAX_WEIGHT;

function ConcentrationLimits({ controls }: { controls: PortfolioParamsControls }) {
  const { params: { selectedTickers, minWeights, maxWeights }, setMinWeights, setMaxWeights } = controls;

  /** Sets the same min (or max) for every ticker, pushing the opposite bound so min <= max holds. */
  const applyGlobal = (kind: 'min' | 'max', value: string) => {
    if (!value) return;
    const val = Number(value) / 100;
    const newMin: WeightBounds = { ...minWeights };
    const newMax: WeightBounds = { ...maxWeights };
    selectedTickers.forEach(t => {
      if (kind === 'min') {
        newMin[t] = val;
        if (maxOf(newMax, t) < val) newMax[t] = val;
      } else {
        newMax[t] = val;
        if (minOf(newMin, t) > val) newMin[t] = val;
      }
    });
    setMinWeights(newMin);
    setMaxWeights(newMax);
  };

  const reset = () => {
    const newMax: WeightBounds = {};
    const newMin: WeightBounds = {};
    selectedTickers.forEach(t => {
      newMax[t] = DEFAULT_MAX_WEIGHT;
      newMin[t] = DEFAULT_MIN_WEIGHT;
    });
    setMaxWeights(newMax);
    setMinWeights(newMin);
  };

  return (
    <div className="pt-4 border-t border-zinc-200 mt-2">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Concentration Limits</h4>
        <div className="flex flex-wrap items-center gap-4 bg-zinc-50 p-2 border border-zinc-200 rounded-sm">
          <div className="flex items-center gap-2">
            <label className="text-[9px] font-mono text-zinc-500">Global Min</label>
            <input
              type="number"
              min="0" max="100" step="1"
              placeholder="5"
              className="w-16 p-1 text-xs font-mono border border-zinc-300"
              onBlur={(e) => applyGlobal('min', e.target.value)}
            />
            <span className="text-[9px] font-mono">%</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[9px] font-mono text-zinc-500">Global Max</label>
            <input
              type="number"
              min="0" max="100" step="1"
              placeholder="20"
              className="w-16 p-1 text-xs font-mono border border-zinc-300"
              onBlur={(e) => applyGlobal('max', e.target.value)}
            />
            <span className="text-[9px] font-mono">%</span>
          </div>
          <button
            className="text-[9px] uppercase tracking-wider text-zinc-600 hover:underline px-2 border-l border-zinc-300"
            onClick={reset}
          >
            Reset
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {selectedTickers.map(ticker => (
          <div key={ticker} className="flex flex-col gap-2 p-2 bg-zinc-50 border border-zinc-200">
            <div className="text-[10px] font-bold text-center border-b border-zinc-200 pb-1">{ticker}</div>

            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-mono text-zinc-500 flex justify-between">
                <span>Min</span>
                <span>{(minOf(minWeights, ticker) * 100).toFixed(0)}%</span>
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
                <span>Max</span>
                <span>{(maxOf(maxWeights, ticker) * 100).toFixed(0)}%</span>
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

export function ParametersPanel({ controls, dataLoading, onRun }: {
  controls: PortfolioParamsControls;
  dataLoading: boolean;
  onRun: () => void;
}) {
  const [open, toggle] = useCollapsible('parameters');
  const { params, setSelectedBenchmark, setHorizonYears, setRiskFreeRate, setUseArimaForecast } = controls;

  return (
    <>
      <button
        onClick={toggle}
        className="flex justify-between items-center bg-[#141414] text-[#E4E3E0] p-3 text-xs font-mono uppercase hover:bg-zinc-800 transition-colors print:hidden"
      >
        <span>⚙️ Parameters & Asset Selection</span>
        <span>{open ? '[-]' : '[+]'}</span>
      </button>

      {open && (
        <div className="p-6 bg-white flex flex-col gap-6 print:hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <TickerPicker controls={controls} />

            <div className="space-y-2">
              <label className={labelClass}>Select Benchmark</label>
              <select
                value={params.selectedBenchmark}
                onChange={(e) => setSelectedBenchmark(e.target.value)}
                className="w-full bg-zinc-50 p-2 text-xs border border-zinc-300 font-mono text-[#141414] focus:outline-none focus:border-[#141414] rounded-sm"
              >
                {BENCHMARKS.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className={labelClass}>Time Horizon</label>
              <div className="flex border border-zinc-300 overflow-hidden rounded-sm">
                {HORIZON_OPTIONS.map((opt, i) => (
                  <button
                    key={opt.value}
                    onClick={() => setHorizonYears(opt.value)}
                    className={cn(
                      "flex-1 py-2 text-[10px] font-bold uppercase transition-colors",
                      params.horizonYears === opt.value ? "bg-[#141414] text-[#E4E3E0]" : "bg-zinc-50 hover:bg-zinc-200 text-[#141414]",
                      i > 0 && "border-l border-zinc-300"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className={labelClass}>Risk-Free Rate (%)</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={params.riskFreeRate * 100}
                  onChange={(e) => setRiskFreeRate(Number(e.target.value) / 100)}
                  className="flex-1 accent-[#141414]"
                />
                <span className="text-xs font-mono w-12 text-right">
                  {(params.riskFreeRate * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          <ConcentrationLimits controls={controls} />

          <div className="pt-4 border-t border-zinc-200 mt-2 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 p-2 px-4 rounded-sm">
              <input
                type="checkbox"
                id="useArima"
                checked={params.useArimaForecast}
                onChange={(e) => setUseArimaForecast(e.target.checked)}
                className="accent-[#141414] w-4 h-4 cursor-pointer"
              />
              <label htmlFor="useArima" className="text-[10px] uppercase tracking-wider text-[#141414] font-bold cursor-pointer">
                Use ARIMA Forecasts instead of Historical Mean
              </label>
            </div>
            <button
              onClick={onRun}
              disabled={dataLoading || params.selectedTickers.length === 0}
              className="w-full sm:w-auto px-8 py-3 flex items-center justify-center gap-2 bg-[#141414] text-[#E4E3E0] font-bold text-xs uppercase tracking-widest hover:bg-zinc-800 transition-colors disabled:opacity-50 mx-auto"
            >
              {dataLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {dataLoading ? 'Fetching Data...' : 'Update Data & Run Optimization'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
