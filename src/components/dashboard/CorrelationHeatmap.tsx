import { Loader2 } from 'lucide-react';
import { useI18n } from '../../i18n';
import { SectionTitle } from '../ui/SectionTitle';

const lerp = (a: number[], b: number[], t: number) =>
  `rgb(${a.map((v, i) => Math.round(v + t * (b[i] - v))).join(', ')})`;

const GREEN = [34, 197, 94];
const YELLOW = [253, 224, 71];
const ORANGE = [249, 115, 22];
const RED = [239, 68, 68];

/** Green (≤ -0.1) to yellow up to 0.4, the upper limit of a desirable correlation; orange to red above it. */
function heatmapColor(val: number) {
  if (val <= 0.4) return lerp(GREEN, YELLOW, Math.max(0, Math.min(1, (val + 0.1) / 0.5)));
  return lerp(ORANGE, RED, Math.min(1, (val - 0.4) / 0.6));
}

export function CorrelationHeatmap({ matrixSymbols, correlationMatrix, isOptimizing }: {
  matrixSymbols: string[];
  correlationMatrix: number[][];
  isOptimizing: boolean;
}) {
  const { t, f } = useI18n();
  return (
    <div className="flex flex-col h-full bg-white border border-ink">
      <div className="flex justify-between items-end mb-2">
        <SectionTitle>{t('heatmap.title')}</SectionTitle>
      </div>
      <div className="flex-1 bg-white border border-ink overflow-hidden overflow-x-auto relative min-h-[200px]">
        {isOptimizing && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
            <Loader2 className="w-8 h-8 text-ink animate-spin mb-2" />
            <span className="text-xs font-mono font-bold text-ink animate-pulse">{t('heatmap.computing')}</span>
          </div>
        )}

        <table className="w-full text-left border-collapse h-full">
          <thead>
            <tr className="border-b border-ink bg-panel">
              <th className="p-2 border-r border-zinc-200"></th>
              {matrixSymbols.map(sym => (
                <th key={sym} className="p-2 text-[10px] font-serif italic border-r border-zinc-200 text-center min-w-[50px]">{sym}</th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono text-[11px]">
            {matrixSymbols.map((rowSym, i) => (
              <tr key={rowSym} className="border-b border-zinc-100">
                <td className="p-2 border-r border-zinc-200 font-bold bg-panel text-[10px]">{rowSym}</td>
                {correlationMatrix[i]?.map((val, j) => (
                  // Cell text stays dark in both themes: the pastel backgrounds are the same
                  <td key={j} className="p-2 border-r border-zinc-200 text-center text-[#141414] font-bold transition-all duration-300 hover:scale-105 hover:brightness-110 hover:shadow-sm cursor-crosshair" style={{ backgroundColor: heatmapColor(val) }}>
                    {f.num(val)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
