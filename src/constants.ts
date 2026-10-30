export const DEFAULT_TICKERS = ['NBIS', 'PCAR', 'NVO', 'WTM', 'SGOV', 'AEP', 'VRTX'];
export const BENCHMARKS = ['ACWI', 'SPY', 'QQQ', 'DIA', 'ECH'];
export const HORIZON_OPTIONS = [
  { label: '1 Year', value: 1 },
  { label: '3 Years', value: 3 },
  { label: '5 Years', value: 5 },
];
export const MAX_ASSETS = 30;

/** Weight bounds applied to a ticker that has no explicit min/max set */
export const DEFAULT_MIN_WEIGHT = 0.05;

/**
 * Minimum weight for a ticker without an explicit min: 5%, but never more than half an equal share,
 * so the defaults stay feasible with many assets (30 x 5% would need 150%).
 */
export function defaultMinWeight(assetCount: number) {
  return Math.min(DEFAULT_MIN_WEIGHT, 0.5 / Math.max(assetCount, 1));
}
export const DEFAULT_MAX_WEIGHT = 1.0;

export const TRADING_DAYS = 252;
/** Random portfolios drawn behind the efficient frontier chart (the optimizer itself is exact) */
export const FRONTIER_CHART_SAMPLES = 2000;

export const POPULAR_TICKERS = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corp.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.' },
  { symbol: 'META', name: 'Meta Platforms' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'BRK-B', name: 'Berkshire Hathaway' },
  { symbol: 'JNJ', name: 'Johnson & Johnson' },
  { symbol: 'V', name: 'Visa Inc.' },
  { symbol: 'PG', name: 'Procter & Gamble' },
  { symbol: 'JPM', name: 'JPMorgan Chase' },
  { symbol: 'UNH', name: 'UnitedHealth Group' },
  { symbol: 'MA', name: 'Mastercard Inc.' },
  { symbol: 'HD', name: 'Home Depot' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust' },
  { symbol: 'VTI', name: 'Vanguard Total Stock Mkt ETF' },
  { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond' },
  { symbol: 'GLD', name: 'SPDR Gold Shares' },
  { symbol: 'ACWI', name: 'iShares MSCI ACWI ETF' },
  { symbol: 'DIA', name: 'SPDR Dow Jones Industrial Average ETF' },
  { symbol: 'IAU', name: 'iShares Gold Trust' },
  { symbol: 'XLK', name: 'Technology Select Sector SPDR Fund' },
  { symbol: 'LLY', name: 'Eli Lilly and Co' },
  { symbol: 'USCI', name: 'United States Commodity Index Fund' },
  { symbol: 'MU', name: 'Micron Technology' },
  { symbol: 'ITA', name: 'iShares U.S. Aerospace & Defense ETF' }
];

export const DEFAULT_DASHBOARD_WIDGETS = ['coreMetrics', 'historicalBacktester', 'correlationHeatmap', 'optimalWeights', 'efficientFrontier', 'sectorBreakdown', 'portfolioMetrics', 'factorInvesting'];

export const DEFAULT_WIDGET_SIZES: Record<string, number> = {
  coreMetrics: 3,
  historicalBacktester: 3,
  correlationHeatmap: 3,
  optimalWeights: 2,
  efficientFrontier: 4,
  sectorBreakdown: 6,
  portfolioMetrics: 6,
  factorInvesting: 6
};
