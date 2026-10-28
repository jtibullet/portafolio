import { correlation, mean, stdDev } from '../utils/quantMath';
import { TRADING_DAYS } from '../constants';
import type { EvaluatedCandidate, RecommendationCandidate, Recommendations } from '../types';

const MIN_OVERLAP_DAYS = 50;
const MAX_CORRELATION = 0.3;
const MAX_RESULTS = 20;

/** Correlation and Sharpe of each candidate against the portfolio, over the dates both have prices. */
export function evaluateCandidate(
  candidate: RecommendationCandidate,
  portfolioDates: string[],
  portfolioReturns: (number | null)[],
  riskFreeRate: number,
): EvaluatedCandidate | null {
  const candidateReturns: number[] = [];
  const alignedPortReturns: (number | null)[] = [];

  for (let i = 1; i < portfolioDates.length; i++) {
    const p1 = candidate.pricesByDate[portfolioDates[i - 1]];
    const p2 = candidate.pricesByDate[portfolioDates[i]];
    if (p1 && p2) {
      candidateReturns.push(Math.log(p2 / p1));
      alignedPortReturns.push(portfolioReturns[i - 1]);
    }
  }

  if (candidateReturns.length < MIN_OVERLAP_DAYS) return null;

  const annRet = mean(candidateReturns) * TRADING_DAYS;
  const annVol = stdDev(candidateReturns) * Math.sqrt(TRADING_DAYS);
  return {
    ...candidate,
    correlation: correlation(candidateReturns, alignedPortReturns),
    sharpe: annVol > 0 ? (annRet - riskFreeRate) / annVol : 0,
  };
}

/**
 * Two lists of low-correlation candidates not already in the portfolio:
 * growth (near the 6-month high with positive momentum) and dip (15%+ below it but turning up).
 */
export function buildRecommendations(
  candidates: RecommendationCandidate[],
  portfolioDates: string[],
  portfolioReturns: (number | null)[],
  riskFreeRate: number,
  selectedTickers: string[],
): Recommendations {
  const unselected = candidates
    .map(c => evaluateCandidate(c, portfolioDates, portfolioReturns, riskFreeRate))
    .filter((c): c is EvaluatedCandidate => c !== null)
    .filter(c => !selectedTickers.includes(c.symbol));

  const growth = unselected
    .filter(c => c.drawdown >= -0.05 && c.momentum20D > 0 && c.correlation < MAX_CORRELATION)
    .sort((a, b) => a.correlation - b.correlation)
    .slice(0, MAX_RESULTS);

  const dip = unselected
    .filter(c => c.drawdown <= -0.15 && c.momentum20D > 0 && c.correlation < MAX_CORRELATION)
    .sort((a, b) => b.momentum20D - a.momentum20D)
    .slice(0, MAX_RESULTS);

  return { growth, dip };
}
