import { Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Line, Cell } from 'recharts';
import { interpolatePlasma } from 'd3-scale-chromatic';
import { useI18n } from '../../i18n';
import { DARK_CHART } from '../../lib/chartTheme';
import { SectionTitle } from '../ui/SectionTitle';
import type { PortfolioOptimization } from '../../optimization';
import type { AssetStat } from '../../types';

const axisLabel = { fontSize: 10, fontFamily: 'monospace', fill: DARK_CHART.tick };
const axisTick = { fill: DARK_CHART.tick, fontSize: 10 };

/** Simulated portfolios colored by Sharpe ratio, the efficient frontier, each asset and the optimal portfolio. */
export function EfficientFrontier({ optimization, assetStats, matrixSymbols }: {
  optimization: PortfolioOptimization;
  assetStats: AssetStat[];
  matrixSymbols: string[];
}) {
  const { t, f } = useI18n();
  const simulated = optimization.simulated || [];
  const maxSharpe = Math.max(...simulated.map(p => p.sharpeRatio), optimization.optimal.sharpeRatio, 0);
  const minSharpe = Math.min(...simulated.map(p => p.sharpeRatio), 0);
  const sharpeRange = maxSharpe - minSharpe + 0.0001;
  const optimalName = t('frontier.optimal');

  return (
    <div className="flex flex-col h-full bg-white border border-ink">
      <div className="flex justify-between items-end mb-2">
        <SectionTitle>{t('frontier.title')}</SectionTitle>
      </div>
      <div className={`flex-1 ${DARK_CHART.background} border border-ink p-2 sm:p-4 min-h-[300px]`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 20, right: 10, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={DARK_CHART.grid} vertical={false} />
            <XAxis
              allowDuplicatedCategory={false}
              dataKey="volatility"
              type="number"
              domain={['auto', 'auto']}
              tickFormatter={(val) => f.pct(val, 1)}
              label={{ value: t('frontier.xLabel'), position: 'insideBottom', offset: -10, ...axisLabel }}
              stroke={DARK_CHART.axis}
              tick={axisTick}
            />
            <YAxis
              dataKey="expectedReturn"
              type="number"
              domain={['auto', 'auto']}
              tickFormatter={(val) => f.pct(val, 1)}
              label={{ value: t('frontier.yLabel'), angle: -90, position: 'insideLeft', ...axisLabel }}
              stroke={DARK_CHART.axis}
              tick={axisTick}
              width={48}
            />
            <Tooltip
              contentStyle={DARK_CHART.tooltip}
              formatter={(value: number, name: string, props: any) => {
                if (name === optimalName && props.payload.weights) {
                  const w: number[] = props.payload.weights;
                  const weights = matrixSymbols.map((s, i) => `${s}: ${f.pct(w[i], 1)}`).join(', ');
                  return [f.pct(value), `${t('frontier.return')} | ${weights}`];
                }
                return [f.pct(value), name];
              }}
              labelFormatter={(label) => t('frontier.vol', { value: f.pct(Number(label)) })}
            />

            <Scatter name={t('frontier.simulated')} data={simulated} isAnimationActive={false}>
              {simulated.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={interpolatePlasma((entry.sharpeRatio - minSharpe) / sharpeRange)} />
              ))}
            </Scatter>
            <Line data={optimization.frontier} type="basis" dataKey="expectedReturn" stroke="#fff" strokeWidth={2} dot={false} name={t('frontier.curve')} isAnimationActive={false} />
            <Scatter
              name={t('frontier.assets')}
              data={assetStats.map(s => ({ volatility: s.annVolatility, expectedReturn: s.annReturn, name: s.symbol }))}
              fill="#9ca3af"
              isAnimationActive={false}
            />
            <Scatter
              name={optimalName}
              data={[{
                volatility: optimization.optimal.volatility,
                expectedReturn: optimization.optimal.expectedReturn,
                name: 'Max Sharpe',
                weights: optimization.optimal.weights
              }]}
              fill="#fbbf24"
              shape="star"
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
