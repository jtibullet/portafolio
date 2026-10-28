import React from 'react';
import { cn } from '../../lib/cn';
import type { QuantStats } from '../../types';

function MetricCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#141414] p-4 flex flex-col justify-center transition-all duration-300 hover:scale-105 hover:shadow-md hover:bg-zinc-50">
      <div className="text-[10px] uppercase tracking-tighter text-zinc-500 font-bold mb-1">{label}</div>
      {children}
    </div>
  );
}

export function PortfolioMetricsWidget({ quantStats }: { quantStats: QuantStats }) {
  const optimal = quantStats.optimization!.optimal;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 h-full">
      <MetricCard label="Expected Return (μ)">
        <div className="text-xl font-mono">{(optimal.expectedReturn * 100).toFixed(2)}%</div>
      </MetricCard>
      <MetricCard label="Volatility (σ)">
        <div className="text-xl font-mono">{(optimal.volatility * 100).toFixed(2)}%</div>
      </MetricCard>
      <MetricCard label="Sharpe Ratio">
        <div className="text-xl font-mono text-green-600">{optimal.sharpeRatio.toFixed(3)}</div>
      </MetricCard>
      <MetricCard label="Portfolio Beta (β)">
        <div className="text-xl font-mono">{quantStats.portBeta.toFixed(3)}</div>
      </MetricCard>
      <MetricCard label="CAPM Expected Return">
        <div className="text-xl font-mono">{(quantStats.portCAPM * 100).toFixed(2)}%</div>
      </MetricCard>
      <MetricCard label="Jensen's Alpha (α)">
        <div className={cn("text-xl font-mono font-bold", quantStats.portAlpha >= 0 ? "text-green-600" : "text-red-600")}>
          {(quantStats.portAlpha * 100).toFixed(2)}%
        </div>
      </MetricCard>
    </div>
  );
}
