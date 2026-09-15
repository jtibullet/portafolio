const fs = require('fs');
let code = fs.readFileSync('src/utils/quantMath.ts', 'utf8');

// The file had a syntax error from a previous bad patch:
// It looks like `calculateARIMA110` or whatever was left with extra brackets.
// Let's just find the start of calculateARIMA111 and the start of AlphaSignalResult, and replace everything in between.

const startIndex = code.indexOf('export function calculateARIMA111');
let endIndex = code.indexOf('export interface AlphaSignalResult');
if (startIndex !== -1 && endIndex !== -1) {
    const replacement = `export function calculateARIMA111(prices: number[], forecastHorizon: number = 252): ARIMA_Forecast {
  if (prices.length < 10) {
    throw new Error("Insufficient data for ARIMA");
  }

  // 1. Stationarity & Differencing (d=1)
  // Differencing removes trends to achieve a weakly stationary series.
  const diffs = new Float64Array(prices.length - 1);
  for (let i = 1; i < prices.length; i++) {
    diffs[i - 1] = prices[i] - prices[i - 1];
  }
  const n = diffs.length;

  // 2. Autoregression (AR(1))
  // Calculate AR(1) coefficient (phi) using exact Least Squares (OLS)
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n - 1; i++) {
    const x = diffs[i];
    const y = diffs[i + 1];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const meanX = sumX / (n - 1);
  const meanY = sumY / (n - 1);
  
  const denominator = sumX2 - (n - 1) * meanX * meanX;
  let phi = denominator !== 0 ? (sumXY - (n - 1) * meanX * meanY) / denominator : 0;
  
  // Bound phi to (-1, 1) to enforce AR(1) stationarity
  if (Math.abs(phi) >= 1) {
    phi = Math.sign(phi) * 0.99;
  }
  
  const c = meanY - phi * meanX;
  
  // 3. Moving Average of Residuals (MA(1))
  // Calculate residual shocks (actual - AR predicted)
  const residuals = new Float64Array(n);
  residuals[0] = 0; // No residual for the first differenced point
  
  for (let i = 1; i < n; i++) {
    const predictedDiff = c + phi * diffs[i - 1];
    residuals[i] = diffs[i] - predictedDiff;
  }
  
  // Fit MA(1) coefficient (theta) via OLS on residuals
  let sumResX = 0, sumResY = 0, sumResXY = 0, sumResX2 = 0;
  for (let i = 1; i < n - 1; i++) {
    const resX = residuals[i];
    const resY = residuals[i + 1];
    sumResX += resX;
    sumResY += resY;
    sumResXY += resX * resY;
    sumResX2 += resX * resX;
  }
  
  const meanResX = sumResX / (n - 2);
  const meanResY = sumResY / (n - 2);
  
  const resDenominator = sumResX2 - (n - 2) * meanResX * meanResX;
  let theta = resDenominator !== 0 ? (sumResXY - (n - 2) * meanResX * meanResY) / resDenominator : 0;
  
  // Bound theta to (-1, 1) for invertibility
  if (Math.abs(theta) >= 1) {
    theta = Math.sign(theta) * 0.99;
  }
  
  // 4. Forecasting & Integration (I)
  const forecastedPrices = new Float64Array(forecastHorizon);
  let currentPrice = prices[prices.length - 1];
  let lastDiff = diffs[n - 1];
  let lastResidual = residuals[n - 1];
  
  for (let i = 0; i < forecastHorizon; i++) {
    // ARMA(1, 1) forecast equation on the differenced series: 
    // D_t = c + phi * D_{t-1} + theta * epsilon_{t-1}
    const nextDiff = c + (phi * lastDiff) + (theta * lastResidual);
    
    // Un-difference (Re-integrate) to return to original price scale: P_t = P_{t-1} + D_t
    currentPrice += nextDiff;
    forecastedPrices[i] = currentPrice;
    
    // Step forward: future residuals are expected to be 0 (white noise)
    lastDiff = nextDiff;
    lastResidual = 0; 
  }
  
  const initialPrice = prices[prices.length - 1];
  const finalPrice = forecastedPrices[forecastHorizon - 1];
  
  // Avoid division by zero edge case
  const expectedReturn = initialPrice !== 0 ? (finalPrice - initialPrice) / initialPrice : 0;

  return {
    symbol: "unknown",
    isStationary: Math.abs(phi) < 1,
    expectedReturn,
    historicalPrices: prices,
    forecastedPrices: Array.from(forecastedPrices)
  };
}

`;
    
    code = code.substring(0, startIndex) + replacement + code.substring(endIndex);
    fs.writeFileSync('src/utils/quantMath.ts', code);
    console.log("Patched successfully");
} else {
    console.log("Could not find bounds");
}
