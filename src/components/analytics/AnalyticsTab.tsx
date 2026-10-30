import React from 'react';
import { ProbabilisticScenarios } from './ProbabilisticScenarios';
import { BlackLittermanPanel } from './BlackLittermanPanel';
import { MonteCarloPanel } from './MonteCarloPanel';
import type { MonteCarloResult } from '../../monteCarlo';
import type { BlackLittermanStats, InvestorView, QuantStats } from '../../types';

export function AnalyticsTab({ quantStats, blStats, views, setViews, mcResult, mcYears, setMcYears, mcInitialAmount, setMcInitialAmount }: {
  quantStats: QuantStats;
  blStats: BlackLittermanStats | null;
  views: Record<string, InvestorView>;
  setViews: React.Dispatch<React.SetStateAction<Record<string, InvestorView>>>;
  mcResult: MonteCarloResult | null;
  mcYears: number;
  setMcYears: (years: number) => void;
  mcInitialAmount: number;
  setMcInitialAmount: (amount: number) => void;
}) {
  const optimal = quantStats.optimization?.optimal;
  return (
    <>
      {optimal && <ProbabilisticScenarios mu={optimal.expectedReturn} sigma={optimal.volatility} />}
      {blStats && optimal && <BlackLittermanPanel quantStats={quantStats} blStats={blStats} views={views} setViews={setViews} />}
      <MonteCarloPanel available={!!optimal} result={mcResult} years={mcYears} setYears={setMcYears} initialAmount={mcInitialAmount} setInitialAmount={setMcInitialAmount} />
    </>
  );
}
