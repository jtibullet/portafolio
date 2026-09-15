const fs = require('fs');
let code = fs.readFileSync('src/utils/quantMath.ts', 'utf8');

const additional = `
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

`;

fs.writeFileSync('src/utils/quantMath.ts', code + '\n' + additional);
