import type { ConstraintCode, PortfolioOptimization } from './optimization';

export type TabId = 'dashboard' | 'analytics' | 'ai' | 'validation';

/** One row of /api/historical: a date plus one adjusted close (or null) per symbol. */
export type PriceRow = { date: string } & Record<string, number | string | null>;

export interface AssetStat {
  symbol: string;
  annReturn: number;
  annVolatility: number;
  beta: number;
  capmExpectedReturn: number;
  alpha: number;
  sharpeRatio: number;
}

export interface QuantStats {
  assetStats: AssetStat[];
  /** Selected tickers that have data, in the same order as assetStats and the matrices */
  matrixSymbols: string[];
  covarianceMatrix: number[][];
  correlationMatrix: number[][];
  optimization: PortfolioOptimization | null;
  portBeta: number;
  portCAPM: number;
  portAlpha: number;
  benchAnnReturn: number;
  portDailyReturns: (number | null)[];
  benchDailyReturns: (number | null)[];
  dates: string[];
}

export interface StressTestResult {
  maxDrawdown: number;
  cvar99: number;
}

export interface BlackLittermanStats {
  pi: number[];
  blReturns: number[];
  blCovariance: number[][];
  optimization: PortfolioOptimization;
  stress: StressTestResult;
}

export interface InvestorView {
  view: number;
  conf: number;
}

export type WeightBounds = Record<string, number>;

/** Shape returned by /api/metadata */
export interface AssetMetadata {
  symbol: string;
  totalAssets: number | null;
  categoryName: string | null;
  quoteTypeStr: string | null;
  marketCap: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  priceToBook: number | null;
  returnOnEquity: number | null;
  profitMargins: number | null;
  nameAndDesc: string;
  racionalTicker: string;
  yahooTicker: string;
  lsegTicker: string;
  sector: string;
  currentPrice: number | null;
  targetMeanPrice: number | null;
  expectedGrowth: number | null;
}

export interface NewsItem {
  title: string;
  link: string;
  publisher: string;
  providerPublishTime: string;
}

export interface SentimentResult {
  symbol: string;
  score: number;
  news: NewsItem[];
}

/** Shape returned by /api/recommendations */
export interface RecommendationCandidate {
  symbol: string;
  currentPrice: number;
  sixMonthHigh: number;
  drawdown: number;
  momentum20D: number;
  pricesByDate: Record<string, number>;
}

export interface EvaluatedCandidate extends RecommendationCandidate {
  correlation: number;
  sharpe: number;
}

export interface Recommendations {
  growth: EvaluatedCandidate[];
  dip: EvaluatedCandidate[];
}

export interface SavedPortfolio {
  id: number;
  timestamp: string;
  tickers: string[];
  riskFreeRate: number;
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  weights: number[];
}

/** User-controlled inputs that drive the analysis */
export interface PortfolioParams {
  selectedTickers: string[];
  selectedBenchmark: string;
  horizonYears: number;
  riskFreeRate: number;
  useArimaForecast: boolean;
  minWeights: WeightBounds;
  maxWeights: WeightBounds;
}

/** Why the optimizer could not produce a portfolio; rendered as a translated message. */
export interface OptimizationFailure {
  code: ConstraintCode | 'generic';
  sum?: number;
  min?: number;
  max?: number;
  /** Ticker the failure refers to, for 'minAboveMax' */
  symbol?: string;
}
