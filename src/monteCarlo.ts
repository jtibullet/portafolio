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
  /** Initial investment plus every monthly contribution */
  totalContributed: number;
  /** Share of simulations ending at or above the goal; null without a goal */
  goalProbability: number | null;
}

export interface MonteCarloOptions {
  /** Added at the end of every month (21 trading days) */
  monthlyContribution?: number;
  /** Target final value */
  goal?: number;
}

/** Trading days per month, when contributions are added */
const MONTH_STEPS = 21;

/**
 * @param expectedAnnualLogReturn Annualized mean of daily log returns (mean * 252).
 *   This is already the GBM log drift (mu - sigma^2/2), so no Ito correction is applied here.
 */
export async function runMonteCarlo(
  initialInvestment: number,
  expectedAnnualLogReturn: number,
  annualVolatility: number,
  years: number,
  numSimulations: number = 10000,
  pathsToPlot: number = 100,
  onProgress?: (progress: number) => void,
  { monthlyContribution = 0, goal = 0 }: MonteCarloOptions = {},
): Promise<MonteCarloResult> {
  // Deterministic seed for repeatable Monte Carlo paths
  setSeed(42);

  const dt = 1 / 252;
  const steps = Math.floor(years * 252);
  
  const drift = expectedAnnualLogReturn * dt;
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
        if (monthlyContribution && step % MONTH_STEPS === 0) currentVal += monthlyContribution;
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

  let reached = 0;
  if (goal > 0) for (const v of sortedFinals) if (v >= goal) reached++;

  return {
    percentiles: { p5, p50, p95 },
    paths,
    finalValues: Array.from(sortedFinals),
    totalContributed: initialInvestment + monthlyContribution * Math.floor(steps / MONTH_STEPS),
    goalProbability: goal > 0 ? reached / numSimulations : null,
  };
}
