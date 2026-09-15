const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "calculateJensensAlpha, variance, calculateARIMA111, type ARIMA_Forecast, calculateAlphaSignal, type AlphaSignalResult }",
  "calculateJensensAlpha, variance, calculateARIMA111, type ARIMA_Forecast, calculateAlphaSignal, type AlphaSignalResult, calculateBlackLittermanPosterior }"
);

const replaceTarget = `    // ARIMA Module
    let forecasts: Record<string, ARIMA_Forecast> = {};
    if (useArimaForecast) {
      for (let i = 0; i < matrixSymbols.length; i++) {
        const sym = matrixSymbols[i];
        try {
          const validPrices = pricesBySymbol[sym].filter(p => p !== null) as number[];
          const forecast = calculateARIMA111(validPrices, 252);
          forecast.symbol = sym;
          forecasts[sym] = forecast;
          expectedReturns[i] = forecast.expectedReturn;
        } catch (e) {
          console.log(\`ARIMA forecast failed for \${sym}, falling back to historical mean.\`, e);
          // fallback is already in expectedReturns[i]
        }
      }
      setArimaForecasts(forecasts);
    } else {`;

const newCode = `    // ARIMA Module
    let forecasts: Record<string, ARIMA_Forecast> = {};
    if (useArimaForecast) {
      for (let i = 0; i < matrixSymbols.length; i++) {
        const sym = matrixSymbols[i];
        try {
          const validPrices = pricesBySymbol[sym].filter(p => p !== null) as number[];
          const forecast = calculateARIMA111(validPrices, 252);
          forecast.symbol = sym;
          forecasts[sym] = forecast;
          expectedReturns[i] = forecast.expectedReturn;
        } catch (e) {
          console.log(\`ARIMA forecast failed for \${sym}, falling back to historical mean.\`, e);
          // fallback is already in expectedReturns[i]
        }
      }
      
      // BLACK-LITTERMAN POSTERIOR UPDATE
      try {
        const numAssets = matrixSymbols.length;
        // Naive prior uses equal weights for the market portfolio
        const marketWeights = new Array(numAssets).fill(1 / numAssets);
        // Q = The ARIMA expected returns
        const Q = [...expectedReturns];
        // P = Identity matrix (absolute views on every asset)
        const P = Array.from({length: numAssets}, (_, i) => 
          Array.from({length: numAssets}, (_, j) => i === j ? 1 : 0)
        );
        
        // Stabilize ARIMA returns with the Bayesian posterior
        expectedReturns = calculateBlackLittermanPosterior(
          covMatrix,
          marketWeights,
          Q,
          P,
          2.5, // Standard Institutional Risk Aversion (δ)
          0.05 // Standard Uncertainty Scalar (τ)
        );
      } catch (err) {
        console.error("Black-Litterman stabilization failed", err);
      }
      
      setArimaForecasts(forecasts);
    } else {`;

code = code.replace(replaceTarget, newCode);
fs.writeFileSync('src/App.tsx', code);
