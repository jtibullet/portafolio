declare module 'quadprog' {
  /** Goldfarb-Idnani dual QP solver. All arrays are 1-based (index 0 unused), as in the R/Fortran original. */
  export function solveQP(
    Dmat: number[][],
    dvec: number[],
    Amat: number[][],
    bvec?: number[],
    meq?: number,
    factorized?: number[],
  ): {
    solution: number[];
    value: number[];
    Lagrangian: number[];
    unconstrained_solution: number[];
    iterations: number[];
    iact: number[];
    message: string;
  };
}
