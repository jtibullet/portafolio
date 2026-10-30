/**
 * Portfolio construction rules besides max Sharpe. Minimum variance is solved exactly by the QP in
 * optimization.ts; risk parity and HRP don't use expected returns at all, which makes them much
 * less sensitive to estimation error.
 */

/**
 * Moves weights into [lb, ub] while keeping them summing to 1: clip, then hand the shortfall (or
 * excess) to the assets in proportion to their remaining room. One pass is exact because the bounds
 * have already been checked to admit a fully invested portfolio.
 */
export function projectToBounds(weights: number[], lb: number[], ub: number[]) {
  const w = weights.map((x, i) => Math.min(ub[i], Math.max(lb[i], x)));
  const gap = 1 - w.reduce((a, b) => a + b, 0);
  if (Math.abs(gap) < 1e-15) return w;
  const room = w.map((x, i) => (gap > 0 ? ub[i] - x : x - lb[i]));
  const totalRoom = room.reduce((a, b) => a + b, 0);
  return totalRoom > 0 ? w.map((x, i) => x + gap * room[i] / totalRoom) : w;
}

/**
 * Equal risk contribution: every asset contributes the same share of portfolio variance
 * (wᵢ·(Σw)ᵢ equal for all i). Solved by cyclical coordinate descent on Spinu's convex form
 * min ½yᵀΣy − Σ bᵢ ln yᵢ, then w = y / Σy.
 */
export function riskParityWeights(cov: number[][], maxIterations = 1000, tolerance = 1e-12) {
  const n = cov.length;
  const budget = 1 / n;
  const y = cov.map((row, i) => 1 / Math.sqrt(row[i]));
  for (let iter = 0; iter < maxIterations; iter++) {
    let maxChange = 0;
    for (let i = 0; i < n; i++) {
      let c = 0;
      for (let j = 0; j < n; j++) if (j !== i) c += cov[i][j] * y[j];
      const next = (-c + Math.sqrt(c * c + 4 * cov[i][i] * budget)) / (2 * cov[i][i]);
      maxChange = Math.max(maxChange, Math.abs(next - y[i]) / y[i]);
      y[i] = next;
    }
    if (maxChange < tolerance) break;
  }
  const total = y.reduce((a, b) => a + b, 0);
  return y.map(v => v / total);
}

/** Share of portfolio variance coming from each asset: wᵢ(Σw)ᵢ / wᵀΣw. */
export function riskContributions(weights: number[], cov: number[][]) {
  const marginal = cov.map(row => row.reduce((s, v, j) => s + v * weights[j], 0));
  const total = weights.reduce((s, w, i) => s + w * marginal[i], 0);
  return weights.map((w, i) => (w * marginal[i]) / total);
}

/** Asset order that places correlated assets next to each other (single-linkage clustering). */
function hrpOrder(cov: number[][]) {
  const n = cov.length;
  const corr = cov.map((row, i) => row.map((v, j) => v / Math.sqrt(cov[i][i] * cov[j][j])));
  const dist = corr.map(row => row.map(r => Math.sqrt(Math.max(0, 0.5 * (1 - r)))));
  // López de Prado clusters on the distance between columns of the distance matrix
  const d = dist.map((_, i) => dist.map((__, j) =>
    Math.sqrt(dist.reduce((s, row) => s + (row[i] - row[j]) ** 2, 0))));

  type Cluster = { members: number[]; order: number[] };
  let clusters: Cluster[] = Array.from({ length: n }, (_, i) => ({ members: [i], order: [i] }));
  const linkage = (a: Cluster, b: Cluster) => {
    let best = Infinity;
    for (const i of a.members) for (const j of b.members) best = Math.min(best, d[i][j]);
    return best;
  };
  while (clusters.length > 1) {
    let bestPair = [0, 1];
    let bestDist = Infinity;
    for (let a = 0; a < clusters.length; a++) {
      for (let b = a + 1; b < clusters.length; b++) {
        const dd = linkage(clusters[a], clusters[b]);
        if (dd < bestDist) { bestDist = dd; bestPair = [a, b]; }
      }
    }
    const [a, b] = bestPair;
    const merged = { members: [...clusters[a].members, ...clusters[b].members], order: [...clusters[a].order, ...clusters[b].order] };
    clusters = clusters.filter((_, k) => k !== a && k !== b).concat(merged);
  }
  return clusters[0].order;
}

/** Variance of a group of assets held in inverse-variance proportions. */
function clusterVariance(cov: number[][], idx: number[]) {
  const inv = idx.map(i => 1 / cov[i][i]);
  const total = inv.reduce((a, b) => a + b, 0);
  const w = inv.map(v => v / total);
  let variance = 0;
  idx.forEach((i, a) => idx.forEach((j, b) => { variance += w[a] * cov[i][j] * w[b]; }));
  return variance;
}

/**
 * Hierarchical Risk Parity (López de Prado, 2016): order assets by correlation clusters, then split
 * the list in halves recursively, giving each half weight in inverse proportion to its variance.
 */
export function hrpWeights(cov: number[][]) {
  const n = cov.length;
  const weights = new Array(n).fill(1);
  const queue = [hrpOrder(cov)];
  while (queue.length) {
    const items = queue.shift()!;
    if (items.length < 2) continue;
    const left = items.slice(0, Math.floor(items.length / 2));
    const right = items.slice(Math.floor(items.length / 2));
    const vLeft = clusterVariance(cov, left);
    const vRight = clusterVariance(cov, right);
    const alpha = 1 - vLeft / (vLeft + vRight);
    left.forEach(i => { weights[i] *= alpha; });
    right.forEach(i => { weights[i] *= 1 - alpha; });
    queue.push(left, right);
  }
  return weights;
}

/** Weights proportional to market capitalization (or fund assets); null if any is missing. */
export function marketCapWeights(caps: (number | null | undefined)[]) {
  if (caps.length === 0 || caps.some(c => !c || c <= 0)) return null;
  const total = (caps as number[]).reduce((a, b) => a + b, 0);
  return (caps as number[]).map(c => c / total);
}
