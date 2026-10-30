import { calculateLogReturns, variance } from '../utils/quantMath';
import { calculateBlackLitterman, simulateBlackSwan } from '../advancedQuant';
import { optimizePortfolio } from '../optimization';
import { FRONTIER_CHART_SAMPLES, TRADING_DAYS } from '../constants';
import { resolveBounds } from './portfolioAnalysis';
import { marketCapWeights } from './objectives';
import type { BlackLittermanStats, InvestorView, PriceRow, QuantStats, WeightBounds } from '../types';

/**
 * Implied risk aversion δ = (benchmark excess return) / (benchmark variance).
 * A benchmark that underperformed the risk-free rate gives δ <= 0, which would make implied
 * priors fall as risk rises, so the standard δ = 2.5 is used instead.
 */
export function impliedRiskAversion(historicalData: PriceRow[], benchmark: string, benchAnnReturn: number, riskFreeRate: number) {
  const benchPrices = historicalData
    .map(row => row[benchmark] === null ? null : Number(row[benchmark]))
    .filter(v => v !== null) as number[];
  const benchReturns = calculateLogReturns(benchPrices);
  const benchVar = variance(benchReturns) * TRADING_DAYS;
  const impliedDelta = benchVar > 0 ? (benchAnnReturn - riskFreeRate) / benchVar : NaN;
  return Number.isFinite(impliedDelta) && impliedDelta > 0 ? impliedDelta : 2.5;
}

export interface BlackLittermanInput {
  quantStats: QuantStats;
  views: Record<string, InvestorView>;
  historicalData: PriceRow[];
  benchmark: string;
  riskFreeRate: number;
  minWeights: WeightBounds;
  maxWeights: WeightBounds;
  /** Market cap (or fund assets) per asset, aligned with quantStats.matrixSymbols */
  marketCaps?: (number | null)[];
}

/**
 * Black-Litterman posterior (cap-weighted prior, equal weights if any cap is missing; Idzorek confidences),
 * its Max-Sharpe portfolio and a fat-tail stress test.
 */
export async function runBlackLittermanAnalysis(input: BlackLittermanInput): Promise<BlackLittermanStats> {
  const { quantStats, views, historicalData, benchmark, riskFreeRate, minWeights, maxWeights, marketCaps } = input;
  const symbols = quantStats.matrixSymbols;
  const n = symbols.length;
  const capWeights = marketCaps ? marketCapWeights(marketCaps) : null;
  const marketWeights = capWeights ?? Array(n).fill(1 / n);
  const delta = impliedRiskAversion(historicalData, benchmark, quantStats.benchAnnReturn, riskFreeRate);

  const viewsArr = symbols.map(sym => views[sym]?.view ?? 0);
  const confArr = symbols.map(sym => views[sym]?.conf ?? 0.5);

  const { pi, blReturns, blCovariance } = calculateBlackLitterman(quantStats.covarianceMatrix, marketWeights, delta, viewsArr, confArr);

  const { minWeightsArr, maxWeightsArr } = resolveBounds(symbols, minWeights, maxWeights);
  const optimization = await optimizePortfolio(blReturns, blCovariance, riskFreeRate, FRONTIER_CHART_SAMPLES, undefined, maxWeightsArr, minWeightsArr);

  const portDailyVol = optimization.optimal.volatility / Math.sqrt(TRADING_DAYS);
  const stress = simulateBlackSwan(portDailyVol, 1000, 3);

  return { priorSource: capWeights ? 'marketCap' : 'equal', pi, blReturns, blCovariance, optimization, stress };
}
