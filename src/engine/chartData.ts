/** Data shaping for charts and tables, kept out of the components so it can be tested. */
import type { AssetMetadata } from '../types';

/** Growth of 100 for the portfolio and benchmark over the last `days` daily log returns. */
export function buildTrailingPerformance(
  portDailyReturns: (number | null)[],
  benchDailyReturns: (number | null)[],
  dates: string[],
  days = 252,
) {
  let portCum = 100;
  let benchCum = 100;
  const daysToPlot = Math.min(days, portDailyReturns.length);
  const startIndex = portDailyReturns.length - daysToPlot;

  const data = [{ date: dates[startIndex], Portfolio: portCum, Benchmark: benchCum }];
  for (let i = startIndex; i < portDailyReturns.length; i++) {
    // A missing return counts as a flat day
    portCum *= Math.exp(portDailyReturns[i] ?? 0);
    benchCum *= Math.exp(benchDailyReturns[i] ?? 0);
    data.push({ date: dates[i + 1], Portfolio: portCum, Benchmark: benchCum });
  }

  const portTotalRet = portCum - 100;
  const benchTotalRet = benchCum - 100;
  return { data, portTotalRet, benchTotalRet, outperformance: portTotalRet - benchTotalRet };
}

export interface SectorWeight {
  sector: string;
  weight: number;
  assets: { symbol: string; weight: number }[];
}

export function computeSectorWeights(symbols: string[], weights: number[], metadata: AssetMetadata[]): SectorWeight[] {
  const bySector: Record<string, { weight: number; assets: { symbol: string; weight: number }[] }> = {};
  symbols.forEach((sym, i) => {
    const sector = metadata.find(m => m.symbol === sym)?.sector || "Variado";
    bySector[sector] ??= { weight: 0, assets: [] };
    bySector[sector].weight += weights[i];
    bySector[sector].assets.push({ symbol: sym, weight: weights[i] });
  });
  return Object.entries(bySector)
    .map(([sector, data]) => ({ sector, weight: data.weight, assets: data.assets.sort((a, b) => b.weight - a.weight) }))
    .sort((a, b) => b.weight - a.weight);
}

/** Equal-width histogram of already sorted values. */
export function buildHistogram(sortedValues: number[], numBins = 40) {
  const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
  const min = sortedValues[0];
  const max = sortedValues[sortedValues.length - 1];
  let binWidth = (max - min) / numBins;
  if (binWidth <= 0) binWidth = 1;

  const bins = Array.from({ length: numBins }, (_, i) => ({
    name: min + (i + 0.5) * binWidth,
    count: 0,
    rangeLabel: `${compact.format(min + i * binWidth)} - ${compact.format(min + (i + 1) * binWidth)}`
  }));

  for (const val of sortedValues) {
    const binIdx = Math.min(numBins - 1, Math.max(0, Math.floor((val - min) / binWidth)));
    bins[binIdx].count++;
  }
  return bins;
}
