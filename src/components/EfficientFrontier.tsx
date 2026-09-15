import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Line,
  Cell
} from 'recharts';
import { interpolatePlasma } from 'd3-scale-chromatic';
import { OptimizationResult, FrontierPoint } from '../optimization';

export interface EfficientFrontierProps {
  optimization: {
    optimal: OptimizationResult;
    frontier: FrontierPoint[];
    simulated?: any[];
  };
  assetStats: any[];
  matrixSymbols: string[];
}

export const EfficientFrontier: React.FC<EfficientFrontierProps> = ({
  optimization,
  assetStats,
  matrixSymbols
}) => {
  const simulated = optimization.simulated || [];
  const maxSharpe = Math.max(
    ...simulated.map((p: any) => p.sharpeRatio),
    optimization.optimal.sharpeRatio,
    0
  );
  const minSharpe = Math.min(
    ...simulated.map((p: any) => p.sharpeRatio),
    0
  );
  const sharpeRange = maxSharpe - minSharpe + 0.0001;

  return (
    <div className="flex flex-col h-full bg-white border border-[#141414]">
      <div className="flex justify-between items-end mb-2">
        <h3 className="text-xs font-mono uppercase bg-[#141414] text-[#E4E3E0] px-2 py-0.5">
          Efficient Frontier
        </h3>
      </div>
      <div className="flex-1 bg-[#111111] border border-[#141414] p-4 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
            <XAxis
              allowDuplicatedCategory={false}
              dataKey="volatility"
              type="number"
              domain={['auto', 'auto']}
              tickFormatter={(val) => `${(val * 100).toFixed(1)}%`}
              label={{
                value: 'Annualized Volatility (Risk)',
                position: 'insideBottom',
                offset: -10,
                fontSize: 10,
                fontFamily: 'monospace',
                fill: '#888'
              }}
              stroke="#444"
              tick={{ fill: '#888', fontSize: 10 }}
            />
            <YAxis
              dataKey="expectedReturn"
              type="number"
              domain={['auto', 'auto']}
              tickFormatter={(val) => `${(val * 100).toFixed(1)}%`}
              label={{
                value: 'Expected Return',
                angle: -90,
                position: 'insideLeft',
                fontSize: 10,
                fontFamily: 'monospace',
                fill: '#888'
              }}
              stroke="#444"
              tick={{ fill: '#888', fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111',
                borderColor: '#333',
                color: '#eee',
                fontSize: '10px',
                fontFamily: 'monospace'
              }}
              formatter={(value: number, name: string, props: any) => {
                if (name === 'Expected Return') return [`${(value * 100).toFixed(2)}%`, name];
                if (name === 'Optimal Portfolio' && props.payload.weights) {
                  const w = props.payload.weights;
                  const wStr = matrixSymbols
                    .map((s: string, i: number) => `${s}: ${(w[i] * 100).toFixed(1)}%`)
                    .join(', ');
                  return [`${(value * 100).toFixed(2)}%`, `Return | ${wStr}`];
                }
                return [`${(value * 100).toFixed(2)}%`, name];
              }}
              labelFormatter={(label) => `Vol: ${(Number(label) * 100).toFixed(2)}%`}
            />

            <Scatter name="Simulated Portfolios" data={simulated}>
              {simulated.map((entry: any, index: number) => (
                <Cell
                  key={`cell-${index}`}
                  fill={interpolatePlasma((entry.sharpeRatio - minSharpe) / sharpeRange)}
                />
              ))}
            </Scatter>
            <Line
              data={optimization.frontier}
              type="basis"
              dataKey="expectedReturn"
              stroke="#fff"
              strokeWidth={2}
              dot={false}
              name="Efficient Frontier"
            />
            <Scatter
              name="Assets"
              data={assetStats.map((s: any) => ({
                volatility: s.annVolatility,
                expectedReturn: s.annReturn,
                name: s.symbol
              }))}
              fill="#9ca3af"
            />

            <Scatter
              name="Optimal Portfolio"
              data={[
                {
                  volatility: optimization.optimal.volatility,
                  expectedReturn: optimization.optimal.expectedReturn,
                  name: 'Max Sharpe',
                  weights: optimization.optimal.weights
                }
              ]}
              fill="#fbbf24"
              shape="star"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
