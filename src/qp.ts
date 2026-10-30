import { solveQP } from 'quadprog';

export class QPInfeasibleError extends Error {}

/**
 * Minimizes ½ xᵀDx − dᵀx subject to the constraints, using quadprog with 0-based inputs.
 * The first `equalities` constraints are equalities (a·x = b); the rest are a·x ≥ b.
 * D must be symmetric positive definite. Throws QPInfeasibleError when no point satisfies the constraints.
 */
export function solveQuadratic(
  D: number[][],
  d: number[],
  constraints: { a: number[]; b: number }[],
  equalities: number,
): number[] {
  const n = d.length;
  const m = constraints.length;
  // quadprog uses 1-based arrays and stores constraints as columns of Amat
  const Dmat: number[][] = [[]];
  const dvec: number[] = [0];
  const Amat: number[][] = [[]];
  const bvec: number[] = [0];
  for (let i = 1; i <= n; i++) {
    Dmat[i] = [0];
    Amat[i] = [0];
    dvec[i] = d[i - 1];
    for (let j = 1; j <= n; j++) Dmat[i][j] = D[i - 1][j - 1];
    for (let j = 1; j <= m; j++) Amat[i][j] = constraints[j - 1].a[i - 1];
  }
  for (let j = 1; j <= m; j++) bvec[j] = constraints[j - 1].b;

  const result = solveQP(Dmat, dvec, Amat, bvec, equalities);
  if (result.message) {
    if (/inconsistent/i.test(result.message)) throw new QPInfeasibleError(result.message);
    throw new Error(`QP solver failed: ${result.message}`);
  }
  return result.solution.slice(1);
}
