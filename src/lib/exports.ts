import type { PortfolioParams, QuantStats } from '../types';

const HEADERS = ['Asset', 'Weight', 'Expected Return', 'Volatility', 'Sharpe Ratio', 'Beta', 'CAPM E(R)', 'Alpha'];

function triggerDownload(href: string, filename: string) {
  const link = document.createElement('a');
  link.setAttribute('href', href);
  link.setAttribute('download', filename);
  document.body.appendChild(link); // Required for Firefox
  link.click();
  document.body.removeChild(link);
}

/** One row per asset plus a portfolio total row, as raw numbers. */
export function optimizationRows(quantStats: QuantStats) {
  const optimal = quantStats.optimization!.optimal;
  const assetRows = quantStats.assetStats.map((stat, i) => [
    stat.symbol, optimal.weights[i], stat.annReturn, stat.annVolatility, stat.sharpeRatio,
    stat.beta, stat.capmExpectedReturn, stat.alpha,
  ] as (string | number)[]);
  const totalRow = ['PORTFOLIO TOTAL', 1.0, optimal.expectedReturn, optimal.volatility, optimal.sharpeRatio,
    quantStats.portBeta, quantStats.portCAPM, quantStats.portAlpha] as (string | number)[];
  return { assetRows, totalRow };
}

const pct = (v: number) => (v * 100).toFixed(2) + '%';

export function downloadOptimizationCSV(quantStats: QuantStats) {
  const { assetRows, totalRow } = optimizationRows(quantStats);
  const formatRow = ([symbol, w, ret, vol, sharpe, beta, capm, alpha]: (string | number)[], sharpeDigits: number) =>
    [symbol, pct(w as number), pct(ret as number), pct(vol as number), (sharpe as number).toFixed(sharpeDigits),
      (beta as number).toFixed(3), pct(capm as number), pct(alpha as number)].join(',');

  const rows = [...assetRows.map(r => formatRow(r, 2)), '', formatRow(totalRow, 3)];
  const csvContent = "data:text/csv;charset=utf-8," + [HEADERS.join(','), ...rows].join('\n');
  triggerDownload(encodeURI(csvContent), "portfolio_optimization.csv");
}

/** The xlsx library is large, so it is only loaded when an Excel export is requested. */
export async function downloadOptimizationExcel(quantStats: QuantStats) {
  const XLSX = await import('xlsx');
  const { assetRows, totalRow } = optimizationRows(quantStats);
  const worksheet = XLSX.utils.aoa_to_sheet([HEADERS, ...assetRows, [], totalRow]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Optimization Data");
  XLSX.writeFile(workbook, "portfolio_optimization.xlsx");
}

export function downloadStrategyJSON(quantStats: QuantStats, params: PortfolioParams) {
  const optimal = quantStats.optimization!.optimal;
  const dataToExport = {
    timestamp: new Date().toISOString(),
    parameters: {
      tickers: params.selectedTickers,
      benchmark: params.selectedBenchmark,
      horizonYears: params.horizonYears,
      riskFreeRate: params.riskFreeRate,
      useArimaForecast: params.useArimaForecast,
      objective: quantStats.objective,
      covarianceMethod: quantStats.covarianceMethod,
      covarianceShrinkage: quantStats.covarianceShrinkage
    },
    optimizationResults: {
      portfolioMetrics: {
        expectedReturn: optimal.expectedReturn,
        volatility: optimal.volatility,
        sharpeRatio: optimal.sharpeRatio,
        beta: quantStats.portBeta,
        capmExpectedReturn: quantStats.portCAPM,
        alpha: quantStats.portAlpha,
        ...quantStats.portfolioRisk
      },
      weights: quantStats.assetStats.map((stat, i) => ({ symbol: stat.symbol, weight: optimal.weights[i] })),
      assetMetrics: quantStats.assetStats.map(stat => ({
        symbol: stat.symbol,
        expectedReturn: stat.annReturn,
        volatility: stat.annVolatility,
        sharpeRatio: stat.sharpeRatio,
        beta: stat.beta,
        capmExpectedReturn: stat.capmExpectedReturn,
        alpha: stat.alpha
      }))
    }
  };

  const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `institutional_strategy_${new Date().toISOString().split('T')[0]}.json`);
  URL.revokeObjectURL(url);
}
