/**
 * Quantitative Math Module
 * 
 * Handles all core mathematical calculations for the portfolio engine.
 * Translated from traditional Python quant stacks (numpy/scipy) to pure TypeScript.
 */

/**
 * Calculates the daily logarithmic returns for a given array of prices.
 * Formula: r_t = ln(P_t / P_{t-1})
 * 
 * @param prices Array of historical prices
 * @returns Array of logarithmic returns (length is one less than prices)
 */
export function calculateLogReturns(prices: (number | null)[]): (number | null)[] {
  if (!prices) return [];
  const returns: (number | null)[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] !== null && prices[i - 1] !== null && prices[i]! > 0 && prices[i - 1]! > 0) {
      returns.push(Math.log(prices[i]! / prices[i - 1]!));
    } else {
      returns.push(null);
    }
  }
  return returns;
}

export function mean(data: (number | null)[]): number {
  if (!data || data.length === 0) return 0;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i] !== null) {
      sum += data[i] as number;
      count++;
    }
  }
  if (count === 0) return 0;
  return sum / count;
}

export function variance(data: (number | null)[], sample: boolean = true): number {
  if (!data || data.length <= 1) return 0;
  const validData = data.filter(d => d !== null) as number[];
  if (validData.length <= (sample ? 1 : 0)) return 0;
  
  const m = mean(validData);
  let sumSq = 0;
  for (let i = 0; i < validData.length; i++) {
    sumSq += Math.pow(validData[i] - m, 2);
  }
  return sumSq / (validData.length - (sample ? 1 : 0));
}

export function stdDev(data: (number | null)[], sample: boolean = true): number {
  return Math.sqrt(variance(data, sample));
}

export function covariance(data1: (number | null)[], data2: (number | null)[], sample: boolean = true): number {
  if (!data1 || !data2 || data1.length !== data2.length || data1.length <= 1) return 0;
  
  // Pairwise deletion
  const valid1: number[] = [];
  const valid2: number[] = [];
  for (let i = 0; i < data1.length; i++) {
    if (data1[i] !== null && data2[i] !== null) {
      valid1.push(data1[i] as number);
      valid2.push(data2[i] as number);
    }
  }
  if (valid1.length <= (sample ? 1 : 0)) return 0;
  
  const m1 = mean(valid1);
  const m2 = mean(valid2);
  let cov = 0;
  for (let i = 0; i < valid1.length; i++) {
    cov += (valid1[i] - m1) * (valid2[i] - m2);
  }
  return cov / (valid1.length - (sample ? 1 : 0));
}

export function correlation(data1: (number | null)[], data2: (number | null)[]): number {
  // Pairwise deletion correlation
  if (!data1 || !data2 || data1.length !== data2.length) return 0;
  
  const valid1: number[] = [];
  const valid2: number[] = [];
  for (let i = 0; i < data1.length; i++) {
    if (data1[i] !== null && data2[i] !== null) {
      valid1.push(data1[i] as number);
      valid2.push(data2[i] as number);
    }
  }
  if (valid1.length <= 1) return 0;
  
  const sd1 = stdDev(valid1);
  const sd2 = stdDev(valid2);
  if (sd1 === 0 || sd2 === 0) return 0;
  
  // Covariance of valid pairs
  const m1 = mean(valid1);
  const m2 = mean(valid2);
  let cov = 0;
  for (let i = 0; i < valid1.length; i++) {
    cov += (valid1[i] - m1) * (valid2[i] - m2);
  }
  cov = cov / (valid1.length - 1);
  
  return cov / (sd1 * sd2);
}

export function calculateBeta(assetReturns: (number | null)[], benchmarkReturns: (number | null)[]): number {
  if (!assetReturns || !benchmarkReturns || assetReturns.length !== benchmarkReturns.length) return 1.0;
  
  const validAsset: number[] = [];
  const validBench: number[] = [];
  for (let i = 0; i < assetReturns.length; i++) {
    if (assetReturns[i] !== null && benchmarkReturns[i] !== null) {
      validAsset.push(assetReturns[i] as number);
      validBench.push(benchmarkReturns[i] as number);
    }
  }
  
  if (validAsset.length <= 1) return 1.0;
  
  const cov = covariance(validAsset, validBench);
  const varB = variance(validBench);
  if (varB === 0) return 1.0;
  return cov / varB;
}

export function calculateCAPM(riskFreeRate: number, beta: number, expectedMarketReturn: number): number {
  return riskFreeRate + beta * (expectedMarketReturn - riskFreeRate);
}

/**
 * Calculates Jensen's Alpha (α).
 * Formula: Alpha = Actual Annualized Return - CAPM Expected Return
 * 
 * @param actualAnnualReturn The empirical annualized return of the asset
 * @param capmReturn The theoretical expected return from CAPM
 * @returns Jensen's Alpha
 */
export function calculateJensensAlpha(actualAnnualReturn: number, capmReturn: number): number {
  return actualAnnualReturn - capmReturn;
}


export interface ARIMA_Forecast {
  symbol: string;
  isStationary: boolean;
  expectedReturn: number;
  historicalPrices: number[];
  forecastedPrices: number[];
}

export function calculateARIMA111(prices: number[], forecastHorizon: number = 252): ARIMA_Forecast {
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

export interface AlphaSignalResult {
  symbol: string;
  currentSignal: 'Buy' | 'Sell' | 'Neutral';
  signalValue: number;
  historicalPrices: number[];
  sma10: (number | null)[];
  sma30: (number | null)[];
  signalSeries: (number | null)[];
}

export function calculateAlphaSignal(symbol: string, prices: number[]): AlphaSignalResult {
  const sma10 = new Array(prices.length).fill(null);
  const sma30 = new Array(prices.length).fill(null);
  const signalSeries = new Array(prices.length).fill(null);
  
  for (let i = 9; i < prices.length; i++) {
    let sum = 0;
    for (let j = 0; j < 10; j++) sum += prices[i - j];
    sma10[i] = sum / 10;
  }
  
  for (let i = 29; i < prices.length; i++) {
    let sum = 0;
    for (let j = 0; j < 30; j++) sum += prices[i - j];
    sma30[i] = sum / 30;
    signalSeries[i] = sma10[i] - sma30[i];
  }
  
  const latestSignalValue = signalSeries[signalSeries.length - 1] || 0;
  let currentSignal: 'Buy' | 'Sell' | 'Neutral' = 'Neutral';
  if (latestSignalValue > 0) currentSignal = 'Buy';
  else if (latestSignalValue < 0) currentSignal = 'Sell';
  
  return {
    symbol,
    currentSignal,
    signalValue: latestSignalValue,
    historicalPrices: prices,
    sma10,
    sma30,
    signalSeries
  };
}


/**
 * Lightweight PRNG (Mulberry32) for deterministic random paths.
 */
export function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export let seededRandom = mulberry32(42);

export function setSeed(seed: number) {
  seededRandom = mulberry32(seed);
}

export function seededRandomNormal(): number {
  let u = 0, v = 0;
  while(u === 0) u = seededRandom();
  while(v === 0) v = seededRandom();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Calculates the Black-Litterman Posterior Expected Returns.
 * Equation: E[R] = [(τΣ)^-1 + P^T Ω^-1 P]^-1 [(τΣ)^-1 Π + P^T Ω^-1 Q]
 * 
 * @param covMatrix N x N Covariance matrix of assets
 * @param marketCapWeights N x 1 array of market capitalization weights (used for naive prior)
 * @param viewReturns K x 1 array of expected returns from views (e.g., ARIMA)
 * @param P K x N Pick matrix mapping views to assets
 * @param riskAversion Scalar risk aversion parameter (δ). Default: 2.5
 * @param tau Scalar indicating uncertainty of the prior. Default: 0.05
 */
export function calculateBlackLittermanPosterior(
  covMatrix: number[][],
  marketCapWeights: number[],
  viewReturns: number[],
  P: number[][],
  riskAversion: number = 2.5,
  tau: number = 0.05
): number[] {
  const n = covMatrix.length;
  const k = viewReturns.length;
  
  // Matrix helpers
  const transpose = (M: number[][]) => M[0].map((_, c) => M.map(r => r[c]));
  const multiplyMatVec = (M: number[][], V: number[]) => M.map(row => row.reduce((sum, val, i) => sum + val * V[i], 0));
  const multiplyMatMat = (A: number[][], B: number[][]) => A.map(row => transpose(B).map(col => row.reduce((sum, val, i) => sum + val * col[i], 0)));
  const addMat = (A: number[][], B: number[][]) => A.map((row, i) => row.map((val, j) => val + B[i][j]));
  const addVec = (A: number[], B: number[]) => A.map((val, i) => val + B[i]);
  const scaleMat = (M: number[][], scalar: number) => M.map(row => row.map(val => val * scalar));

  // Gauss-Jordan elimination for matrix inversion
  const invertMat = (M: number[][]) => {
    let A = M.map(r => [...r]);
    let I = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => i === j ? 1 : 0));
    for (let i = 0; i < n; i++) {
      let diag = A[i][i];
      if (Math.abs(diag) < 1e-10) {
        for (let r = i + 1; r < n; r++) {
          if (Math.abs(A[r][i]) > 1e-10) {
            let tempA = A[i]; A[i] = A[r]; A[r] = tempA;
            let tempI = I[i]; I[i] = I[r]; I[r] = tempI;
            diag = A[i][i];
            break;
          }
        }
      }
      if (Math.abs(diag) < 1e-10) continue; 
      
      for (let j = 0; j < n; j++) { A[i][j] /= diag; I[i][j] /= diag; }
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          let factor = A[j][i];
          for (let k = 0; k < n; k++) {
            A[j][k] -= factor * A[i][k];
            I[j][k] -= factor * I[i][k];
          }
        }
      }
    }
    return I;
  };

  // 1. Calculate Prior (Π = δ * Σ * w_mkt)
  const prior = multiplyMatVec(scaleMat(covMatrix, riskAversion), marketCapWeights);

  // 2. τ * Σ and its inverse
  const tauCov = scaleMat(covMatrix, tau);
  const tauCovInv = invertMat(tauCov);

  // 3. Ω (uncertainty matrix of views). Heuristic: diag(P * τΣ * P^T)
  const PTauCov = multiplyMatMat(P, tauCov);
  const PTauCovPT = multiplyMatMat(PTauCov, transpose(P));
  const Omega = Array.from({length: k}, (_, i) => 
    Array.from({length: k}, (_, j) => i === j ? (PTauCovPT[i][j] || 1e-6) : 0)
  );
  
  // Custom invert for k x k Omega (since it's strictly diagonal in our definition)
  const invertOmega = (O: number[][]) => {
    return O.map((row, i) => row.map((val, j) => i === j ? (1 / val) : 0));
  };
  const OmegaInv = invertOmega(Omega);

  // 4. Calculate P^T * Ω^-1 * P
  const PT = transpose(P);
  const PTOmegaInv = multiplyMatMat(PT, OmegaInv);
  const PTOmegaInvP = multiplyMatMat(PTOmegaInv, P);

  // 5. Left Term: [(τΣ)^-1 + P^T Ω^-1 P]^-1
  const leftTermInside = addMat(tauCovInv, PTOmegaInvP);
  const leftTerm = invertMat(leftTermInside);

  // 6. Right Term: [(τΣ)^-1 Π + P^T Ω^-1 Q]
  const tauCovInvPi = multiplyMatVec(tauCovInv, prior);
  const PTOmegaInvQ = multiplyMatVec(PTOmegaInv, viewReturns);
  const rightTerm = addVec(tauCovInvPi, PTOmegaInvQ);

  // 7. Posterior Expected Returns
  return multiplyMatVec(leftTerm, rightTerm);
}

