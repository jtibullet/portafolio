import { variance } from './utils/quantMath';

// --- Matrix Math ---
export function multiply(a: number[][], b: number[][]): number[][] {
  const m = a.length, n = a[0].length, p = b[0].length;
  const res = Array(m).fill(0).map(() => Array(p).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < p; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) sum += a[i][k] * b[k][j];
      res[i][j] = sum;
    }
  }
  return res;
}

export function multiplyVector(a: number[][], v: number[]): number[] {
  return a.map(row => row.reduce((sum, val, i) => sum + val * v[i], 0));
}

export function add(a: number[][], b: number[][]): number[][] {
  return a.map((row, i) => row.map((val, j) => val + b[i][j]));
}

export function addVector(a: number[], b: number[]): number[] {
  return a.map((val, i) => val + b[i]);
}

export function scaleMatrix(a: number[][], scalar: number): number[][] {
  return a.map(row => row.map(val => val * scalar));
}

export function invert(matrix: number[][]): number[][] {
  const n = matrix.length;
  const a = matrix.map(row => [...row]);
  const iMat = Array(n).fill(0).map((_, i) => {
    const row = Array(n).fill(0);
    row[i] = 1;
    return row;
  });

  for (let i = 0; i < n; i++) {
    let diag = a[i][i];
    if (diag === 0) {
      for (let j = i + 1; j < n; j++) {
        if (a[j][i] !== 0) {
          const temp = a[i]; a[i] = a[j]; a[j] = temp;
          const tempI = iMat[i]; iMat[i] = iMat[j]; iMat[j] = tempI;
          diag = a[i][i];
          break;
        }
      }
    }
    if (diag === 0) throw new Error("Singular matrix");

    for (let j = 0; j < n; j++) {
      a[i][j] /= diag;
      iMat[i][j] /= diag;
    }

    for (let j = 0; j < n; j++) {
      if (i !== j) {
        const factor = a[j][i];
        for (let k = 0; k < n; k++) {
          a[j][k] -= factor * a[i][k];
          iMat[j][k] -= factor * iMat[i][k];
        }
      }
    }
  }
  return iMat;
}

export function diagonalMatrix(vec: number[]): number[][] {
  const n = vec.length;
  const mat = Array(n).fill(0).map(() => Array(n).fill(0));
  for(let i = 0; i < n; i++) mat[i][i] = vec[i];
  return mat;
}

// --- Black-Litterman ---
export function calculateBlackLitterman(
  covMatrix: number[][],
  w_mkt: number[],
  delta: number,
  views: number[],
  confidences: number[],
  tau: number = 0.05
) {
  // Pi = delta * Cov * w_mkt
  const cov_wmkt = multiplyVector(covMatrix, w_mkt);
  const pi = cov_wmkt.map(v => v * delta);

  // Omega based on Idzorek
  // omega_i = tau * Sigma_ii * (1 - C_i) / C_i
  const omegaVec = confidences.map((c, i) => {
    const conf = Math.max(0.001, Math.min(0.999, c));
    return tau * covMatrix[i][i] * ((1 - conf) / conf);
  });
  
  const omegaInv = diagonalMatrix(omegaVec.map(v => 1 / v));
  
  const tauCov = scaleMatrix(covMatrix, tau);
  const tauCovInv = invert(tauCov);
  
  // E[R] = [ (tau Cov)^-1 + Omega^-1 ]^-1 * [ (tau Cov)^-1 * Pi + Omega^-1 * Q ]
  const term1 = invert(add(tauCovInv, omegaInv));
  const term2a = multiplyVector(tauCovInv, pi);
  const term2b = multiplyVector(omegaInv, views);
  const term2 = addVector(term2a, term2b);
  
  const blReturns = multiplyVector(term1, term2);
  const blCovariance = add(covMatrix, term1);
  
  return {
    pi,
    blReturns,
    blCovariance
  };
}

// --- Synthetic Stress (Black Swan) ---
function boxMuller(): number {
  let u = 0, v = 0;
  while(u === 0) u = Math.random();
  while(v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function chiSquare(df: number): number {
  let sum = 0;
  for(let i = 0; i < df; i++) {
    const z = boxMuller();
    sum += z * z;
  }
  return sum;
}

function studentT(df: number): number {
  const z = boxMuller();
  const v = chiSquare(df);
  return z / Math.sqrt(v / df);
}

export function simulateBlackSwan(
  portfolioDailyVolatility: number,
  numDays: number = 1000,
  df: number = 3
) {
  const scale = portfolioDailyVolatility / Math.sqrt(3);
  
  const returns: number[] = [];
  let cumulative = 1;
  let maxDrawdown = 0;
  let peak = 1;
  
  for (let i = 0; i < numDays; i++) {
    const tVal = studentT(df);
    let dailyReturn = (tVal * scale) - 0.0005; 
    if (dailyReturn < -0.99) dailyReturn = -0.99;
    
    returns.push(dailyReturn);
    
    cumulative *= (1 + dailyReturn);
    if (cumulative > peak) peak = cumulative;
    
    const drawdown = (peak - cumulative) / peak;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  
  const sortedReturns = [...returns].sort((a, b) => a - b);
  const percentileIndex = Math.floor(numDays * 0.01);
  
  const worstReturns = sortedReturns.slice(0, Math.max(1, percentileIndex));
  const cvar = worstReturns.reduce((sum, r) => sum + r, 0) / worstReturns.length;
  
  return {
    maxDrawdown,
    cvar99: Math.abs(cvar)
  };
}
