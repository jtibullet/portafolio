/**
 * Portfolio Optimization Module
 * Uses Monte Carlo simulation to find the optimal portfolio weights
 * maximizing the Sharpe ratio with constraints:
 * - sum(w) = 1
 * - w_i >= 0.05
 */

export interface SimulatedPortfolio {
  weights: number[];
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
}

export interface OptimizationResult {
  weights: number[];
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
}

export interface FrontierPoint {
  volatility: number;
  expectedReturn: number;
}

export async function optimizePortfolio(
  expectedReturns: number[],
  covMatrix: number[][],
  riskFreeRate: number,
  numSimulations: number = 100000,
  onProgress?: (progress: number) => void,
  maxWeights?: number[],
  minWeights?: number[]
): Promise<{ optimal: OptimizationResult, frontier: FrontierPoint[], simulated: SimulatedPortfolio[] }> {
  const n = expectedReturns.length;
  
  // Create an array of minWeights, defaulting to 0.05 if not provided or empty
  const minW = minWeights || new Array(n).fill(0.05);
  let sumMinWeights = 0;
  for (let j = 0; j < n; j++) {
      sumMinWeights += minW[j];
  }
  
  const remainingWeight = 1 - sumMinWeights;
  
  if (remainingWeight < 0) {
    throw new Error(`Minimum weight constraints (sum = ${(sumMinWeights*100).toFixed(1)}%) exceed 100%.`);
  }

  let maxSharpe = -Infinity;
  let bestWeights: number[] = new Array(n).fill(1/n);
  // Ensure bestWeights satisfy minimum bounds (simple fix)
  let bestSum = 0;
  for (let j = 0; j < n; j++) {
    bestWeights[j] = Math.max(minW[j], bestWeights[j]);
    bestSum += bestWeights[j];
  }
  for(let j = 0; j < n; j++) bestWeights[j] /= bestSum;

  let bestReturn = 0;
  let bestVol = 0;

  // Track portfolios for efficient frontier curve
  const minReturn = Math.min(...expectedReturns);
  const maxReturn = Math.max(...expectedReturns);
  
  const numBuckets = 100;
  // If maxReturn == minReturn, handle edge case safely
  const returnStep = maxReturn > minReturn ? (maxReturn - minReturn) / numBuckets : 0.01;
  const frontierBuckets = new Array(numBuckets).fill(Infinity);
  const frontierReturns = new Array(numBuckets).fill(0);
  const simulated: SimulatedPortfolio[] = [];

  // Seed with equal weights just in case
  let initialVar = 0;
  for (let j = 0; j < n; j++) {
    let rowSum = 0;
    for (let k = 0; k < n; k++) {
      rowSum += bestWeights[k] * covMatrix[j][k];
    }
    initialVar += bestWeights[j] * rowSum;
  }
  bestVol = Math.sqrt(initialVar);
  for (let j = 0; j < n; j++) bestReturn += bestWeights[j] * expectedReturns[j];
  maxSharpe = (bestReturn - riskFreeRate) / bestVol;

  const chunkSize = 5000;
  
  for (let chunkStart = 0; chunkStart < numSimulations; chunkStart += chunkSize) {
    const chunkEnd = Math.min(chunkStart + chunkSize, numSimulations);
    
    for (let i = chunkStart; i < chunkEnd; i++) {
      // Generate random weights on the simplex
      let valid = false;
      let weights = new Array(n);
      let pReturn = 0;
      let attempts = 0;
      
      while (!valid && attempts < 50) {
        attempts++;
        let randSum = 0;
        const rands = new Array(n);
        for (let j = 0; j < n; j++) {
          // using -log(Math.random()) for exponential distribution to sample uniformly from simplex
          rands[j] = -Math.log(Math.random());
          randSum += rands[j];
        }
        
        valid = true;
        pReturn = 0;
        for (let j = 0; j < n; j++) {
          weights[j] = minW[j] + (rands[j] / randSum) * remainingWeight;
          if (maxWeights && weights[j] > maxWeights[j]) {
            valid = false;
            break;
          }
          pReturn += weights[j] * expectedReturns[j];
        }
      }
      if (!valid) continue;
      
      // Calculate portfolio variance: w^T * Cov * w
      let pVar = 0;
      for (let j = 0; j < n; j++) {
        let rowSum = 0;
        for (let k = 0; k < n; k++) {
          rowSum += weights[k] * covMatrix[j][k];
        }
        pVar += weights[j] * rowSum;
      }
      
      const pVol = Math.sqrt(pVar);
      const sharpe = (pReturn - riskFreeRate) / pVol;
      
      if (sharpe > maxSharpe) {
        maxSharpe = sharpe;
        bestWeights = weights;
        bestReturn = pReturn;
        bestVol = pVol;
      }

      // Save a subset for plotting the scatter plot
      if (Math.random() < 0.02) { // approx 2000 points
        simulated.push({ weights, expectedReturn: pReturn, volatility: pVol, sharpeRatio: sharpe });
      }
      
      // Update frontier buckets
      if (returnStep > 0) {
        const bucketIdx = Math.floor((pReturn - minReturn) / returnStep);
        if (bucketIdx >= 0 && bucketIdx < numBuckets) {
          if (pVol < frontierBuckets[bucketIdx]) {
            frontierBuckets[bucketIdx] = pVol;
            frontierReturns[bucketIdx] = pReturn;
          }
        }
      }
    }
    
    if (onProgress) {
      onProgress(chunkEnd / numSimulations);
    }
    // Yield to the event loop so UI doesn't freeze
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  // Clean weights to exactly 4 decimal places while maintaining sum=1
  const cleanedWeights = bestWeights.map(w => Math.round(w * 10000) / 10000);
  const sumDiff = 1 - cleanedWeights.reduce((a, b) => a + b, 0);
  if (Math.abs(sumDiff) > 0) {
    // Add difference to the largest weight to correct rounding error
    let maxIdx = 0;
    for (let i = 1; i < n; i++) {
      if (cleanedWeights[i] > cleanedWeights[maxIdx]) maxIdx = i;
    }
    cleanedWeights[maxIdx] += sumDiff;
  }

  // Construct frontier points - only the upper efficient half
  const frontier: FrontierPoint[] = [];
  let currentMinVol = Infinity;
  for (let i = numBuckets - 1; i >= 0; i--) { 
    if (frontierBuckets[i] !== Infinity) {
      if (frontierBuckets[i] < currentMinVol) {
        currentMinVol = frontierBuckets[i];
        frontier.push({
          expectedReturn: frontierReturns[i],
          volatility: frontierBuckets[i]
        });
      }
    }
  }
  frontier.reverse();

  // Add the optimal point to the frontier if it's not well represented
  frontier.push({ expectedReturn: bestReturn, volatility: bestVol });
  frontier.sort((a, b) => a.volatility - b.volatility);

  return {
    optimal: {
      weights: cleanedWeights,
      expectedReturn: bestReturn,
      volatility: bestVol,
      sharpeRatio: maxSharpe
    },
    frontier,
    simulated
  };
}
