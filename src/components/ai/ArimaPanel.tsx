import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useUiState } from '../../hooks/useUiState';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import type { ARIMA_Forecast } from '../../utils/quantMath';

function ForecastTable({ forecasts, selected, onSelect }: {
  forecasts: ARIMA_Forecast[];
  selected: string | null;
  onSelect: (symbol: string) => void;
}) {
  return (
    <div className="flex-1 overflow-x-auto border border-zinc-200">
      <table className="w-full text-left text-xs font-mono">
        <thead className="bg-zinc-50 border-b border-zinc-200">
          <tr>
            <th className="p-2 border-r border-zinc-200">Ticker</th>
            <th className="p-2 border-r border-zinc-200 text-center">ADF Stationarity</th>
            <th className="p-2 text-right">1-Year Forecast E(R)</th>
          </tr>
        </thead>
        <tbody>
          {forecasts.map(f => (
            <tr
              key={f.symbol}
              className={`border-b border-zinc-100 cursor-pointer transition-colors ${selected === f.symbol ? 'bg-zinc-100' : 'hover:bg-zinc-50'}`}
              onClick={() => onSelect(f.symbol)}
            >
              <td className="p-2 border-r border-zinc-200 font-bold">{f.symbol}</td>
              <td className="p-2 border-r border-zinc-200 text-center">
                {f.isStationary ? <span className="text-green-600">True</span> : <span className="text-red-600">False</span>}
              </td>
              <td className={`p-2 text-right ${f.expectedReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(f.expectedReturn * 100).toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ForecastChart({ forecast }: { forecast: ARIMA_Forecast }) {
  const history = forecast.historicalPrices.length;
  const data: { index: number; historicalPrice: number | null; forecastPrice: number | null }[] = [
    ...forecast.historicalPrices.map((p, i) => ({ index: i, historicalPrice: p, forecastPrice: null })),
    ...forecast.forecastedPrices.map((p, i) => ({ index: history + i, historicalPrice: null, forecastPrice: p })),
  ];
  // Start the forecast line at the last observed price so the two lines connect
  if (data.length > history) data[history - 1].forecastPrice = data[history - 1].historicalPrice;

  return (
    <>
      <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-center">{forecast.symbol} Forecast Trajectory</h4>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
          <XAxis allowDuplicatedCategory={false} dataKey="index" tick={false} axisLine={false} />
          <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v.toFixed(0)}`} width={40} />
          <Tooltip labelFormatter={() => ''} formatter={(v: number) => `$${v.toFixed(2)}`} />
          <Line type="monotone" dataKey="historicalPrice" stroke="#141414" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="forecastPrice" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} strokeDasharray="5 5" />
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}

export function ArimaPanel({ enabled, forecasts }: { enabled: boolean; forecasts: Record<string, ARIMA_Forecast> }) {
  const [selected, setSelected] = useUiState<string | null>('arima:ticker', null);

  return (
    <CollapsibleSection id="arima" title="📈 Advanced Time-Series Forecasting (ARIMA)" className="mt-8 print:hidden">
      <div className="bg-white border border-[#141414] border-t-0 p-4">
        {!enabled ? (
          <div className="text-center text-zinc-500 italic text-sm">Please enable ARIMA forecasts in the Optimization Settings to view this module.</div>
        ) : Object.keys(forecasts).length > 0 ? (
          <div className="flex flex-col md:flex-row gap-6">
            <ForecastTable forecasts={Object.values(forecasts)} selected={selected} onSelect={setSelected} />
            <div className="flex-1 flex flex-col min-h-[300px]">
              {selected && forecasts[selected] ? (
                <ForecastChart forecast={forecasts[selected]} />
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-400 italic text-sm">Select a ticker to view trajectory</div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center text-zinc-500 italic text-sm">Waiting for ARIMA computation...</div>
        )}
      </div>
    </CollapsibleSection>
  );
}
