const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const jsonFunc = `  const downloadStrategyJSON = () => {
    if (!quantStats) return;

    const dataToExport = {
      timestamp: new Date().toISOString(),
      parameters: {
        tickers: selectedTickers,
        benchmark: selectedBenchmark,
        horizonYears,
        riskFreeRate,
        useArimaForecast,
        useBlackLitterman
      },
      optimizationResults: {
        portfolioMetrics: {
          expectedReturn: quantStats.optimization.optimal.expectedReturn,
          volatility: quantStats.optimization.optimal.volatility,
          sharpeRatio: quantStats.optimization.optimal.sharpeRatio,
          beta: quantStats.portBeta,
          capmExpectedReturn: quantStats.portCAPM,
          alpha: quantStats.portAlpha
        },
        weights: quantStats.assetStats.map((stat: any, i: number) => ({
          symbol: stat.symbol,
          weight: quantStats.optimization.optimal.weights[i]
        })),
        assetMetrics: quantStats.assetStats.map((stat: any, i: number) => ({
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

    const jsonStr = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \`institutional_strategy_\${new Date().toISOString().split('T')[0]}.json\`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
`;

code = code.replace("XLSX.writeFile(workbook, \"portfolio_optimization.xlsx\");\n  };\n", "XLSX.writeFile(workbook, \"portfolio_optimization.xlsx\");\n  };\n\n" + jsonFunc);

fs.writeFileSync('src/App.tsx', code);
