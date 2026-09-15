import { seededRandomNormal, setSeed } from './utils/quantMath';

export function randomNormal(): number {
  return seededRandomNormal();
}

export interface MonteCarloResult {
  percentiles: {
    p5: number;
    p50: number;
    p95: number;
  };
  paths: number[][]; // Subset of paths for plotting
  finalValues: number[]; // All 10,000 final values for histogram
}

export async function runMonteCarlo(
  initialInvestment: number,
  expectedAnnualReturn: number,
  annualVolatility: number,
  years: number,
  numSimulations: number = 10000,
  pathsToPlot: number = 100,
  onProgress?: (progress: number) => void
): Promise<MonteCarloResult> {
  // Deterministic seed for repeatable Monte Carlo paths
  setSeed(42);

  const dt = 1 / 252;
  const steps = Math.floor(years * 252);
  
  const drift = (expectedAnnualReturn - 0.5 * annualVolatility * annualVolatility) * dt;
  const vol = annualVolatility * Math.sqrt(dt);

  const finalValues = new Float64Array(numSimulations);
  const paths: number[][] = [];

  const chunkSize = 2000;

  for (let chunkStart = 0; chunkStart < numSimulations; chunkStart += chunkSize) {
    const chunkEnd = Math.min(chunkStart + chunkSize, numSimulations);
    
    for (let i = chunkStart; i < chunkEnd; i++) {
      let currentVal = initialInvestment;
      const path = (i < pathsToPlot) ? [currentVal] : null;
      for (let step = 1; step <= steps; step++) {
        const z = randomNormal();
        currentVal = currentVal * Math.exp(drift + vol * z);
        if (path) {
          path.push(currentVal);
        }
      }
      
      finalValues[i] = currentVal;
      if (path) {
        paths.push(path);
      }
    }
    if (onProgress) {
      onProgress(chunkEnd / numSimulations);
    }
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  const sortedFinals = Float64Array.from(finalValues).sort();
  const p5 = sortedFinals[Math.floor(numSimulations * 0.05)];
  const p50 = sortedFinals[Math.floor(numSimulations * 0.50)];
  const p95 = sortedFinals[Math.floor(numSimulations * 0.95)];

  return {
    percentiles: { p5, p50, p95 },
    paths,
    finalValues: Array.from(sortedFinals)
  };
}
