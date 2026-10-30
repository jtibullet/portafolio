import React from 'react';
import { cn } from '../../lib/cn';
import { useI18n } from '../../i18n';
import type { QuantStats } from '../../types';

function MetricCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-ink p-3 sm:p-4 flex flex-col justify-center transition-all duration-300 hover:scale-105 hover:shadow-md hover:bg-zinc-50">
      <div className="text-[10px] uppercase tracking-tighter text-zinc-500 font-bold mb-1">{label}</div>
      {children}
    </div>
  );
}

export function PortfolioMetricsWidget({ quantStats }: { quantStats: QuantStats }) {
  const { t, f } = useI18n();
  const optimal = quantStats.optimization!.optimal;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 h-full">
      <MetricCard label={t('metrics.expectedReturn')}>
        <div className="text-lg sm:text-xl font-mono">{f.pct(optimal.expectedReturn)}</div>
      </MetricCard>
      <MetricCard label={t('metrics.volatility')}>
        <div className="text-lg sm:text-xl font-mono">{f.pct(optimal.volatility)}</div>
      </MetricCard>
      <MetricCard label={t('metrics.sharpe')}>
        <div className="text-lg sm:text-xl font-mono text-green-600">{f.num(optimal.sharpeRatio, 3)}</div>
      </MetricCard>
      <MetricCard label={t('metrics.beta')}>
        <div className="text-lg sm:text-xl font-mono">{f.num(quantStats.portBeta, 3)}</div>
      </MetricCard>
      <MetricCard label={t('metrics.capm')}>
        <div className="text-lg sm:text-xl font-mono">{f.pct(quantStats.portCAPM)}</div>
      </MetricCard>
      <MetricCard label={t('metrics.alpha')}>
        <div className={cn("text-lg sm:text-xl font-mono font-bold", quantStats.portAlpha >= 0 ? "text-green-600" : "text-red-600")}>
          {f.pct(quantStats.portAlpha)}
        </div>
      </MetricCard>
    </div>
  );
}
