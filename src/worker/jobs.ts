/**
 * Heavy computations, callable either inside the Web Worker or directly (tests, or browsers
 * without module workers). Inputs and outputs are plain data so they can cross postMessage.
 */
import { prepareAnalysis, optimizePreparedAnalysis, type AnalysisInput } from '../engine/portfolioAnalysis';
import { runBlackLittermanAnalysis, type BlackLittermanInput } from '../engine/blackLittermanAnalysis';
import { runMonteCarlo } from '../monteCarlo';

export async function analyzeJob(input: AnalysisInput) {
  const prepared = prepareAnalysis(input);
  if (!prepared) return null;
  const { quantStats, optimizationError } = await optimizePreparedAnalysis(prepared, input.riskFreeRate, input.minWeights, input.maxWeights, input.objective);
  return { quantStats, optimizationError, arimaForecasts: prepared.arimaForecasts, alphaSignals: prepared.alphaSignals };
}

export interface MonteCarloInput {
  initialAmount: number;
  expectedReturn: number;
  volatility: number;
  years: number;
}

export const JOBS = {
  analyze: analyzeJob,
  blackLitterman: (input: BlackLittermanInput) => runBlackLittermanAnalysis(input),
  monteCarlo: (input: MonteCarloInput) => runMonteCarlo(input.initialAmount, input.expectedReturn, input.volatility, input.years),
};

export type JobName = keyof typeof JOBS;
export type JobInput<K extends JobName> = Parameters<(typeof JOBS)[K]>[0];
export type JobOutput<K extends JobName> = Awaited<ReturnType<(typeof JOBS)[K]>>;
