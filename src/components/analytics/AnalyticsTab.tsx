import React from 'react';
import { ProbabilisticScenarios } from './ProbabilisticScenarios';
import { BlackLittermanPanel } from './BlackLittermanPanel';
import { MonteCarloPanel } from './MonteCarloPanel';
import type { MonteCarloResult } from '../../monteCarlo';
import type { BlackLittermanStats, InvestorView, MonteCarloSettings, QuantStats } from '../../types';

export function AnalyticsTab({ quantStats, blStats, views, setViews, mcResult, mcSettings, setMcSettings, currency }: {
  quantStats: QuantStats;
  blStats: BlackLittermanStats | null;
  views: Record<string, InvestorView>;
  setViews: React.Dispatch<React.SetStateAction<Record<string, InvestorView>>>;
  mcResult: MonteCarloResult | null;
  mcSettings: MonteCarloSettings;
  setMcSettings: (settings: MonteCarloSettings) => void;
  currency: 'USD' | 'CLP';
}) {
  const optimal = quantStats.optimization?.optimal;
  return (
    <>
      {optimal && <ProbabilisticScenarios mu={optimal.expectedReturn} sigma={optimal.volatility} />}
      {blStats && optimal && <BlackLittermanPanel quantStats={quantStats} blStats={blStats} views={views} setViews={setViews} />}
      <MonteCarloPanel available={!!optimal} result={mcResult} settings={mcSettings} onChange={setMcSettings} currency={currency} />
    </>
  );
}
