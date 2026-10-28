/** Full-screen whitepaper describing the data pipeline and the math behind each model. */
export function MethodologyModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-[#E4E3E0] flex flex-col font-sans overflow-hidden">
      {/* Modal Header */}
      <div className="flex justify-between items-center bg-[#141414] text-[#E4E3E0] p-4 border-b border-zinc-800 shrink-0">
        <div>
          <h2 className="text-lg font-bold tracking-tighter">METHODOLOGY & MATHEMATICAL PROOF</h2>
          <p className="text-[10px] font-mono uppercase text-zinc-400 mt-1">Academic Whitepaper & Engine Audit</p>
        </div>
        <button 
          onClick={onClose}
          className="text-[#E4E3E0] hover:text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1 font-mono text-xs transition-colors"
        >
          Close [X]
        </button>
      </div>
      
      {/* Modal Content */}
      <div className="flex-1 overflow-y-auto p-8 lg:p-12">
        <div className="max-w-4xl mx-auto bg-white border border-[#141414] p-8 lg:p-16 shadow-2xl">
          
          <h1 className="text-3xl font-serif font-bold text-[#141414] mb-4 text-center">Quantitative Engine Methodology</h1>
          <p className="text-sm font-mono text-center text-zinc-500 mb-12 border-b border-zinc-200 pb-8">
            Institutional Documentation & Mathematical Proofs
          </p>

          <div className="space-y-12 text-[#141414] font-serif leading-relaxed">
            
            {/* Phase 1: Data Provenance */}
            <section>
              <h2 className="text-xl font-bold font-sans uppercase tracking-tight mb-4 border-l-4 border-[#141414] pl-4">1. Data Provenance & Ingestion</h2>
              <p className="mb-4">
                All historical pricing data is extracted in real-time from the <span className="cursor-help font-semibold text-blue-800 underline decoration-dotted" title="Yahoo Finance API: A robust, widely-used financial data provider. We use 'yahoo-finance2' on the Node.js backend.">Yahoo Finance</span> API. 
                Crucially, the engine relies exclusively on the <span className="cursor-help font-semibold text-blue-800 underline decoration-dotted" title="Adjusted Close price accounts for all corporate actions such as stock splits and dividend distributions, providing a strictly accurate measure of historical return.">Adjusted Close</span> (<code className="font-mono text-xs bg-zinc-100 px-1">Adj Close</code>) time series.
              </p>
              <p>
                The universe of assets is inherently compatible with US-listed Equities, ETFs, and ADRs (American Depositary Receipts), ensuring direct applicability for global investors using institutional brokers (e.g., Racional, Interactive Brokers).
              </p>
            </section>

            {/* Phase 2: Statistical Engine */}
            <section>
              <h2 className="text-xl font-bold font-sans uppercase tracking-tight mb-4 border-l-4 border-[#141414] pl-4">2. Core Statistical Engine</h2>
              <p className="mb-4">
                The foundation of the optimization process relies on accurate continuous compounding metrics. The daily return <i>r<sub>t</sub></i> is calculated as the <span className="cursor-help font-semibold text-blue-800 underline decoration-dotted" title="Log returns are symmetric and time-additive, making them mathematically superior to simple arithmetic returns for multi-period modeling and continuous time finance.">Logarithmic Return</span>:
              </p>
              <div className="bg-zinc-50 p-6 border border-zinc-200 text-center font-mono my-4 text-lg">
                r<sub>t</sub> = ln(P<sub>t</sub> / P<sub>t-1</sub>)
              </div>
              <p className="mb-4">
                From this sequence of daily log returns, we derive the annualized expected return and risk matrix. The <span className="cursor-help font-semibold text-blue-800 underline decoration-dotted" title="Volatility (Risk) is the standard deviation of returns. We multiply the daily volatility by the square root of 252 (the standard number of trading days in a year) to annualize it.">Annualized Volatility</span> (<i>σ<sub>ann</sub></i>) is calculated via the square root of time rule:
              </p>
              <div className="bg-zinc-50 p-6 border border-zinc-200 text-center font-mono my-4 text-lg">
                σ<sub>ann</sub> = σ<sub>daily</sub> × √252
              </div>
              <p>
                Furthermore, the theoretical <span className="cursor-help font-semibold text-blue-800 underline decoration-dotted" title="Capital Asset Pricing Model: E(R) = Rf + Beta * (E(Rm) - Rf). It describes the relationship between systematic risk and expected return for assets.">CAPM</span> expected return is computed to quantify the asset's idiosyncratic performance (Jensen's Alpha) against market Beta.
              </p>
            </section>

            {/* Phase 3: Markowitz Optimization */}
            <section>
              <h2 className="text-xl font-bold font-sans uppercase tracking-tight mb-4 border-l-4 border-[#141414] pl-4">3. Modern Portfolio Theory (Markowitz Optimization)</h2>
              <p className="mb-4">
                The optimal portfolio is found by solving a constrained convex optimization problem. The objective function is to <span className="cursor-help font-semibold text-blue-800 underline decoration-dotted" title="The Sharpe Ratio measures risk-adjusted return: (Expected Return - Risk Free Rate) / Portfolio Volatility. Maximizing it yields the Tangency Portfolio on the Efficient Frontier.">Maximize the Sharpe Ratio</span>:
              </p>
              <div className="bg-zinc-50 p-6 border border-zinc-200 text-center font-mono my-4 text-lg">
                max [ (w<sup>T</sup>μ - R<sub>f</sub>) / √(w<sup>T</sup>Σw) ]
              </div>
              <p className="mb-4">
                Where <i>w</i> is the vector of asset weights, <i>μ</i> is the vector of expected returns, <i>Σ</i> is the covariance matrix, and <i>R<sub>f</sub></i> is the risk-free rate.
              </p>
              <p className="mb-2">The solver enforces strictly the following constraints:</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li><span className="cursor-help font-semibold text-blue-800 underline decoration-dotted" title="The sum of all asset weights must equal exactly 100%. No leverage is assumed.">Fully Invested</span>: Σ <i>w<sub>i</sub></i> = 1</li>
                <li><span className="cursor-help font-semibold text-blue-800 underline decoration-dotted" title="No short selling is permitted in this model. All asset weights must be positive.">Long-Only</span>: <i>w<sub>i</sub></i> &ge; 0</li>
                <li><span className="cursor-help font-semibold text-blue-800 underline decoration-dotted" title="To prevent mathematical edge cases where an asset receives an infinitesimally small weight (e.g., 0.0001%), we enforce a floor of 5% for selected assets.">Practical Floor</span>: <i>w<sub>i</sub></i> &ge; 0.05 (for non-zero allocations)</li>
              </ul>
            </section>

            {/* Phase 5: Black-Litterman */}
            <section>
              <h2 className="text-xl font-bold font-sans uppercase tracking-tight mb-4 border-l-4 border-[#141414] pl-4">4. Black-Litterman Model (Bayesian Updating)</h2>
              <p className="mb-4">
                To overcome Markowitz's extreme sensitivity to historical return estimates, we implement the <span className="cursor-help font-semibold text-blue-800 underline decoration-dotted" title="A mathematical model that combines market equilibrium returns (implied by CAPM) with subjective investor views using Bayesian inference.">Black-Litterman</span> approach. We start by calculating the Implied Equilibrium Returns (<i>Π</i>) using reverse optimization:
              </p>
              <div className="bg-zinc-50 p-6 border border-zinc-200 text-center font-mono my-4 text-lg">
                Π = δ Σ w<sub>mkt</sub>
              </div>
              <p className="mb-4">
                We then inject absolute subjective views matrix (<i>P</i> and <i>Q</i>). To calculate the uncertainty of these views (the diagonal matrix <i>Ω</i>), we utilize <span className="cursor-help font-semibold text-blue-800 underline decoration-dotted" title="Idzorek's method translates a user-friendly 'confidence percentage' (0-100%) into statistical variance, calculating the Omega matrix elements without requiring the user to estimate variances manually.">Idzorek's Method</span>, converting percentage-based user confidence into strict statistical variance. The posterior combined expected return is calculated as:
              </p>
              <div className="bg-zinc-50 p-6 border border-zinc-200 text-center font-mono my-4 text-[14px]">
                E[R] = [ (τΣ)<sup>-1</sup> + P<sup>T</sup>Ω<sup>-1</sup>P ]<sup>-1</sup> [ (τΣ)<sup>-1</sup>Π + P<sup>T</sup>Ω<sup>-1</sup>Q ]
              </div>
            </section>

            {/* Phase 6: Monte Carlo */}
            <section>
              <h2 className="text-xl font-bold font-sans uppercase tracking-tight mb-4 border-l-4 border-[#141414] pl-4">5. Monte Carlo Simulation & Stress Testing</h2>
              <p className="mb-4">
                To project future wealth and quantify tail risks, we employ a <span className="cursor-help font-semibold text-blue-800 underline decoration-dotted" title="A stochastic process modeling asset prices where the logarithm of the randomly varying quantity follows a Brownian motion (Wiener process).">Geometric Brownian Motion (GBM)</span> model to simulate 10,000 independent parallel paths for the optimized portfolio.
              </p>
              <div className="bg-zinc-50 p-6 border border-zinc-200 text-center font-mono my-4 text-lg">
                S<sub>t</sub> = S<sub>t-1</sub> exp[ (μ - 0.5σ<sup>2</sup>)dt + σ√dt Z ]
              </div>
              <p>
                Where <i>Z</i> is a random draw from the standard normal distribution <i>N(0,1)</i>. By evaluating the terminal distribution of these 10,000 paths, we accurately extract the <span className="cursor-help font-semibold text-blue-800 underline decoration-dotted" title="Value at Risk (VaR) at the 5th percentile represents the pessimistic 'Bear Market' scenario. It means there is a 95% confidence that the portfolio will perform better than this threshold.">5th Percentile (Value at Risk)</span> and 95th Percentile thresholds to stress-test the structural integrity of the portfolio under extreme market volatility.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
