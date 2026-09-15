import YahooFinance from 'yahoo-finance2';
const yahooFinance = typeof YahooFinance === 'function' ? new YahooFinance() : new (YahooFinance as any).default();

// Simple matrix solver for Polynomial Regression
function solveLinearSystem(A: number[][], B: number[]): number[] {
    const n = B.length;
    for (let i = 0; i < n; i++) {
        let maxRow = i;
        for (let k = i + 1; k < n; k++) {
            if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) maxRow = k;
        }
        
        let tempRow = A[i];
        A[i] = A[maxRow];
        A[maxRow] = tempRow;
        
        let tempVal = B[i];
        B[i] = B[maxRow];
        B[maxRow] = tempVal;
        
        for (let k = i + 1; k < n; k++) {
            let factor = A[k][i] / A[i][i];
            for (let j = i; j < n; j++) {
                A[k][j] -= factor * A[i][j];
            }
            B[k] -= factor * B[i];
        }
    }
    
    let X = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        let sum = B[i];
        for (let j = i + 1; j < n; j++) {
            sum -= A[i][j] * X[j];
        }
        X[i] = sum / A[i][i];
    }
    return X;
}

function polyFit(x: number[], y: number[], degree: number): number[] {
    const n = x.length;
    let A = new Array(degree + 1).fill(0).map(() => new Array(degree + 1).fill(0));
    let B = new Array(degree + 1).fill(0);
    
    for (let r = 0; r <= degree; r++) {
        for (let c = 0; c <= degree; c++) {
            let sum = 0;
            for (let i = 0; i < n; i++) sum += Math.pow(x[i], r + c);
            A[r][c] = sum;
        }
        let sum = 0;
        for (let i = 0; i < n; i++) sum += y[i] * Math.pow(x[i], r);
        B[r] = sum;
    }
    return solveLinearSystem(A, B);
}

function polyEval(coeffs: number[], x: number): number {
    let sum = 0;
    for (let i = 0; i < coeffs.length; i++) sum += coeffs[i] * Math.pow(x, i);
    return sum;
}

// CDF of Normal
function normCDF(x: number): number {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2.0);
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return 0.5 * (1.0 + sign * y);
}

function blackScholesCall(S: number, K: number, T: number, r: number, sigma: number): number {
    if (T <= 0 || sigma <= 0) return Math.max(S - K, 0);
    const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);
    return S * normCDF(d1) - K * Math.exp(-r * T) * normCDF(d2);
}

async function main() {
    const ticker = 'AAPL';
    const opts = await yahooFinance.options(ticker);
    const S = opts.quote.regularMarketPrice!;
    
    // Pick the second expiration date if available
    const expDateStr = opts.expirationDates.length > 3 ? opts.expirationDates[3] : opts.expirationDates[0];
    const optsChain = await yahooFinance.options(ticker, { date: expDateStr });
    const calls = optsChain.options[0].calls;
    
    const T = Math.max(0.01, (new Date(expDateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 365));
    const r = 0.05; // 5% risk free rate
    
    console.log(`S=${S}, T=${T}, calls=${calls.length}`);
    
    let strikes: number[] = [];
    let ivs: number[] = [];
    let logMoneyness: number[] = [];
    
    for (const call of calls) {
        if (call.impliedVolatility && call.impliedVolatility > 0.01 && call.volume && call.volume > 0) {
            strikes.push(call.strike);
            ivs.push(call.impliedVolatility);
            logMoneyness.push(Math.log(call.strike / S));
        }
    }
    
    if (strikes.length < 4) {
        console.log("Not enough liquid options");
        return;
    }
    
    const minLM = Math.min(...logMoneyness);
    const maxLM = Math.max(...logMoneyness);
    
    // Fit IV smile with cubic polynomial on log-moneyness
    const coeffs = polyFit(logMoneyness, ivs, 2); // Quadratic is safer
    
    const getIV = (lm: number) => {
        let x = lm;
        if (x < minLM) x = minLM;
        if (x > maxLM) x = maxLM;
        const val = polyEval(coeffs, x);
        return Math.max(0.01, Math.min(2.0, val));
    }
    
    // Generate dense grid
    const minK = S * 0.5;
    const maxK = S * 2.0;
    const steps = 500;
    const dK = (maxK - minK) / steps;
    
    let densities: {k: number, density: number, call: number}[] = [];
    for (let K = minK + dK; K < maxK - dK; K += dK) {
        const kMinus = K - dK;
        const kPlus = K + dK;
        
        const lm = Math.log(K / S);
        const lmMinus = Math.log(kMinus / S);
        const lmPlus = Math.log(kPlus / S);
        
        const iv = getIV(lm);
        const ivMinus = getIV(lmMinus);
        const ivPlus = getIV(lmPlus);
        
        const c = blackScholesCall(S, K, T, r, iv);
        const cMinus = blackScholesCall(S, kMinus, T, r, ivMinus);
        const cPlus = blackScholesCall(S, kPlus, T, r, ivPlus);
        
        let secondDeriv = (cPlus - 2 * c + cMinus) / (dK * dK);
        let density = Math.exp(r * T) * secondDeriv;
        if (density < 0 || isNaN(density)) density = 0;
        
        densities.push({ k: K, density, call: c });
    }
    
    // Normalize density
    let totalProb = 0;
    for (let i = 0; i < densities.length - 1; i++) {
        totalProb += 0.5 * (densities[i].density + densities[i+1].density) * dK;
    }
    if (totalProb > 0) {
        densities.forEach(d => d.density /= totalProb);
    }
    
    // Integrate > 1.2 * S
    let prob20 = 0;
    const targetK = S * 1.2;
    for (let i = 0; i < densities.length - 1; i++) {
        if (densities[i].k >= targetK) {
            prob20 += 0.5 * (densities[i].density + densities[i+1].density) * dK;
        }
    }
    
    console.log(`Normalized Total Prob: ${totalProb}`);
    console.log(`Prob > 20%: ${(prob20 * 100).toFixed(4)}%`);
}

main();
