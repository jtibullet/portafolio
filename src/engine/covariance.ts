/**
 * Ledoit-Wolf (2004) shrinkage covariance: a weighted average of the sample covariance S and the
 * scaled identity m·I (m = average variance), with the weight δ that minimizes the expected error.
 * Sample covariances from a few hundred days are noisy with many assets, and the optimizer
 * amplifies that noise into extreme weights; shrinking pulls the estimate toward a stable target.
 *
 * Uses only the days on which every asset has a return (complete cases).
 * Returns the daily covariance (unbiased scale, like the sample covariance) and δ in [0, 1].
 */
export function ledoitWolfCovariance(series: (number | null)[][]): { cov: number[][]; shrinkage: number } | null {
  const n = series.length;
  if (n === 0) return null;
  const T0 = series[0].length;
  const rows: number[][] = [];
  for (let t = 0; t < T0; t++) {
    const row = series.map(s => s[t]);
    if (row.every(v => v !== null && Number.isFinite(v))) rows.push(row as number[]);
  }
  const T = rows.length;
  if (T < 3) return null;

  const means = Array.from({ length: n }, (_, i) => rows.reduce((s, r) => s + r[i], 0) / T);
  const X = rows.map(r => r.map((v, i) => v - means[i]));

  // Sample covariance with 1/T, as in the paper
  const S = Array.from({ length: n }, () => new Array(n).fill(0));
  for (const x of X) {
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) S[i][j] += x[i] * x[j];
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) S[i][j] /= T;

  // Norms use the paper's normalized Frobenius norm: ||A||² = tr(AAᵀ) / n
  const m = S.reduce((s, row, i) => s + row[i], 0) / n;
  let d2 = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) d2 += (S[i][j] - (i === j ? m : 0)) ** 2;
  d2 /= n;

  let bBar2 = 0;
  for (const x of X) {
    let norm = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) norm += (x[i] * x[j] - S[i][j]) ** 2;
    bBar2 += norm / n;
  }
  bBar2 /= T * T;

  const b2 = Math.min(bBar2, d2);
  const shrinkage = d2 > 0 ? b2 / d2 : 1;
  // Rescale to the unbiased (T-1) convention used by the rest of the app
  const unbias = T / (T - 1);
  const cov = S.map((row, i) => row.map((v, j) => unbias * (shrinkage * (i === j ? m : 0) + (1 - shrinkage) * v)));
  return { cov, shrinkage };
}
