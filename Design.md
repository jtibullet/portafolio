# Institutional Quantitative Portfolio Application

## Architecture
The application strictly adheres to a modular architecture translated for the web stack (React/Vite/Express):
- **`server.ts`**: Express backend entry point. Handles API extraction (Yahoo Finance) for historical prices and exchange rates, including robust error handling.
- **`src/App.tsx`**: Main React UI component. Contains sidebar layout elements (tickers, benchmark, horizon) and displays tables/metrics.
- **`src/quantMath.ts`**: Quantitative Math Module. Contains core statistical and financial logic (translated from Python numpy/scipy).

## Phase 1: Project Setup & Historical Data Extraction
- **Inputs**: Up to 7 assets, 1 benchmark, time horizon (1, 3, 5 years).
- **Data Fetched**: Daily Adjusted Close prices.
- **Missing Data Handling**: Forward fill (`ffill`) followed by backward fill (`bfill`) to ensure alignment and prevent NaN-related math errors.
- **Exchange Rate**: Current USD/CLP rate fetched via `CLP=X`.
- **Data Verification**: Raw data (head and tail) displayed in the main UI for visual verification.

## Phase 2: Statistical & Risk Engine (Core Math)
- **Logarithmic Returns**: $r_t = \ln(P_t / P_{t-1})$
- **Base Statistics**:
  - Annualized Average Return: Daily Mean $\times 252$
  - Annualized Volatility: Daily Std Dev $\times \sqrt{252}$
- **Matrices**: 
  - Annualized Covariance Matrix: Daily Covariance $\times 252$
  - Correlation Matrix: Pearson correlation coefficient
- **Risk Metrics & CAPM**:
  - Beta ($\beta$): $Cov(R_i, R_m) / Var(R_m)$
  - CAPM Expected Return: $E(R_i) = R_f + \beta \times (E(R_m) - R_f)$
  - Jensen's Alpha ($\alpha$): Actual Annualized Return - CAPM Expected Return
- **UI Integration**:
  - Dynamic Risk-Free Rate input in the sidebar.
  - Core statistics table (Return, Volatility, Sharpe Ratio, Beta, CAPM, Alpha).
  - Covariance matrix table.
  - Correlation matrix interactive heatmap.

## Phase 3: Portfolio Optimization, Portfolio Metrics & Probabilistic Scenarios
- **Optimization Architecture**: 
  - Module `src/optimization.ts` utilizing Monte Carlo simulation.
  - Transforms standard continuous quadratic programming problem into a discrete probability space solution to support real-time constrained execution in the browser.
- **Constraints**:
  - Fully invested: $\sum w_i = 1$
  - Long-only with strict minimum: $w_i \ge 0.05$
- **Objective Function**:
  - Maximize Sharpe Ratio: $\max ( \mu_p - R_f ) / \sigma_p$
- **Portfolio-Level Risk Metrics**:
  - **Portfolio Beta**: Weighted sum of individual asset betas ($\sum w_i \times \beta_i$).
  - **CAPM Expected Return**: Computed using Portfolio Beta and the Risk-Free rate.
  - **Jensen's Alpha**: Portfolio Expected Annual Return - Portfolio CAPM Expected Return.
- **Probabilistic Scenarios**:
  - Lower Expected (1 SD): $\mu_p - 1 \times \sigma_p$
  - Upper Expected (1 SD): $\mu_p + 1 \times \sigma_p$
  - Crisis (95% Confidence Tail): $\mu_p - 1.645 \times \sigma_p$
  - Euphoria (95% Confidence Tail): $\mu_p + 1.645 \times \sigma_p$
- **Visualizations (Recharts)**:
  - Interactive Pie Chart for optimal weights with dynamic lightness mapping (darker blue = higher weight).
  - Efficient Frontier Composed Chart (Curve + Individual Assets + Optimal Portfolio Point).

## Phase 4: Operational Tools & Data Persistence
- **Investment Calculator**: 
  - Dynamic UI component to calculate exact capital allocations.
  - Multiplies optimized weights ($w_i$) by user-provided investment capital.
  - Supports dynamic currency toggle (USD vs. CLP), integrating the USD/CLP exchange rate fetched in Phase 1.
- **Data Persistence (Database)**:
  - Backed by a local `better-sqlite3` database to ensure fast, synchronous disk writes within the container.
  - **Schema `portfolios`**:
    - `id` (INTEGER PRIMARY KEY)
    - `timestamp` (DATETIME)
    - `tickers` (TEXT / JSON Array)
    - `riskFreeRate` (REAL)
    - `expectedReturn` (REAL)
    - `volatility` (REAL)
    - `sharpeRatio` (REAL)
    - `weights` (TEXT / JSON Array)
- **Saved Portfolios History**:
  - Interactive expander tab querying the `portfolios` table to review historical optimizations and tracked metrics.

## Phase 5: Advanced Black-Litterman Model & Synthetic Data Stress Testing
- **Black-Litterman Model (Idzorek's Method)**:
  - **Market Implied Priors**: Approximated using equal weights (or market weights proxy) and benchmark characteristics ($\delta = (R_{bench} - R_f) / \sigma^2_{bench}$).
  - **User Views Integration**: Allows user to input absolute expected returns for each asset.
  - **Confidence Mapping**: Uses Idzorek's approach to map a 0-100% confidence level to the uncertainty matrix $\Omega$.
  - **Optimization**: Computes the posterior expected returns and covariance matrix, then re-runs Sharpe maximization.
- **Synthetic Data Stress Testing (Black Swan Simulator)**:
  - **Fat-Tailed Generator**: Uses a Student's t-distribution with low degrees of freedom (df=3) to simulate 1,000 days of synthetic market returns based on the optimized portfolio's daily volatility.
  - **Risk Metrics**: 
    - **Maximum Drawdown**: Worst peak-to-trough drop in the synthetic dataset.
    - **Conditional VaR (99%)**: Average of the worst 1% of simulated daily returns (Expected Shortfall).
- **Visualizations (Recharts)**:
  - **Comparison Chart**: Side-by-side Bar Chart contrasting Historical Markowitz weights vs. New Black-Litterman weights.

## Phase 6: UI Refinement & Full-Screen Dashboard
- **Layout Architecture**: 
  - Restructured to a true full-screen application. The side-bar navigation was removed in favor of a top-level collapsible "Parameters & Asset Selection" menu.
  - Allows the data tables, Recharts visualizations, and operational panels to maximize available screen real-estate (`w-full`).
- **Responsive Visualizations**: 
  - All charts (Efficient Frontier, Optimal Weights Pie, Correlation Heatmap, and Black-Litterman Comparison) now dynamically resize using `ResponsiveContainer`.

## Phase 7: Investment Calculator & Rebalance Trades
- **Current Holdings**: Users can now input their current holding value per ticker.
- **Dynamic Rebalancing**: Calculates total target capital (Current Holdings + Additional Capital) and subtracts the current holdings to yield the required "Rebalance Trade" (BUY or SELL amount).
- **Visual Progress Indicator**: Adds an inline horizontal bar chart under each asset showing current weight (black), target weight (blue marker), and the required trade direction (green/red shading).

## Phase 8: Data Validation & Price Check
- **Broker Compatibility**: Standardized US tickers (e.g., `IAU`, `ACWI`) without local suffixes to align with Racional broker formatting.
- **Dynamic Cross-Platform Dictionary**: Fetches real-time metadata (company name, description, industry) and standardizes tickers across Racional, Yahoo Finance, and Excel (LSEG) by mapping stock exchange MICs. 
- **Raw Data Visibility**: Added a dedicated "Data Validation" tab to display the underlying historical prices, daily logarithmic returns DataFrames, and the metadata dictionary.
- **Auditability**: Explicitly states the purpose of allowing the user to verify data matches their Racional account before proceeding with optimization.

## Phase 9: Visual Refinement
- **Auto-Complete Ticker Search**: Upgraded the generic ticker input with a custom auto-complete dropdown search component. It filters against a predefined dictionary of popular top-tier global stocks and ETFs (e.g., AAPL, MSFT, SPY), displaying both the symbol and the full company name to improve the user experience and reduce manual entry errors.
- **Color-Scaled Optimal Weights**: The Pie Chart for the Markowitz Optimal Weights now dynamically maps each slice's color to the continuous `Blues` color scale from `d3-scale-chromatic` based on the normalized magnitude of the asset's weight. This ensures that assets with higher allocations are visually distinct and weighted more heavily in color intensity.
- **Custom Correlation Heatmap**: Implemented a custom continuous "Green-Yellow-Red" color scale for the Correlation Matrix. The scale is strictly anchored such that negative/low correlations are Green, exactly `0.4` maps to Yellow (representing the upper limit of desired correlation), and anything strictly greater transitions to Red. The colors are intentionally pastel-toned to maintain readability of the underlying numeric annotations.
- **Layout Adjustments**: Removed the "Annualized Covariance" matrix to reduce clutter, and placed the "Core Risk & Return Metrics" table side-by-side with the "Correlation Heatmap" in a 2-column grid layout for better screen real-estate utilization.
- **Sector Allocation Breakdown**: Added an interactive, collapsible vertical bar chart to visualize the portfolio's aggregated exposure by sector. Calculates values using asset metadata and the optimized portfolio weights, handling ETF classifications gracefully. Features a custom hover tooltip detailing the specific underlying assets and their exact weight contributions within each respective sector.
- **Export & Reporting**: Added a dedicated `Print` button configured with CSS `@media print` rules to cleanly format the interface into a PDF summary report. Added a `CSV` download button to export the optimized portfolio weights and core risk/return metrics natively.

## Phase 10: AI Asset Recommender Engine
- **Data Engine**: Implemented a highly-efficient backend endpoint that evaluates a predefined universe of ~30 globally popular US equities and ETFs. The API retrieves 1-year historical pricing and current analyst target prices using batched asynchronous requests for maximal speed and implements server-side caching.
- **Smart Filtering Algorithms**: Developed two quantitative filters against the user's currently optimized portfolio returns:
  - **Top Growth & Diversification**: Candidates must have a correlation to the current portfolio strictly `< 0.4`, a historical Sharpe ratio `> 1.0`, and an expected 1-year analyst market growth `> 0%`.
  - **Buy The Dip (Undervalued Diversifiers)**: Candidates must exhibit `< 0.4` correlation, a recent 6-month historical return of `<= -15%`, and an expected 1-year market growth `> 5%`.
- **UI Integration**: Injected a clean, collapsible "AI Asset Recommendations" expander below the main optimization results, neatly organizing the quantitative findings in clear data tables without disrupting the core Markowitz math.
## Phase 11: Analyst Target Prices
- **Data Engine**: Extended the backend metadata endpoint to fetch current market prices and 1-year analyst target mean prices via the `financialData` module. Calculates expected market growth.
- **UI Integration**: Added a collapsible "Analyst Targets & Expected Growth" expander seamlessly beneath the Markowitz optimization results, providing a clean tabular view of the portfolio's expected performance strictly according to market analysts.

## Phase 12: Monte Carlo Portfolio Simulation
- **Vectorized Math**: Built an efficient TypeScript implementation of a Geometric Brownian Motion simulation, running 10,000 parallel paths for up to 10 years (2,520,000+ data points) in ~10ms.
- **Visual Future Projections**: Added a "Monte Carlo" tab featuring a Fan Chart (Cone of Uncertainty) to visualize a random sample of 100 paths, alongside a distribution Histogram of the final 10,000 outcomes.
- **Statistical Scenarios**: Calculates and displays prominent metric cards for Median Expected Value (50th percentile), Bull Market (95th percentile), and Bear Market (5th percentile / VaR).

## Phase 13: Educational UI Enhancements
- **Metric Tooltips**: Added native hover tooltips (`title` attributes) to all quantitative metrics across the "Core Risk & Return Metrics", "Analyst Targets", and "AI Asset Recommendations" data tables. Each tooltip explicitly describes the mathematical formula used for calculation or the data source provided by Yahoo Finance, improving transparency and auditability.

## Phase 14: Methodology & Mathematical Proof
- **Institutional Whitepaper View**: Added a full-screen, academic-style modal accessible via a top-level "Methodology & Proof" button.
- **Mathematical Transparency**: Documents the entire pipeline from data ingestion to tail risk simulation. Includes cleanly formatted LaTeX-style equations (e.g., Logarithmic Returns, Markowitz Objective Function, Black-Litterman posterior combined expected returns, Geometric Brownian Motion).
- **Interactive Tooltips**: Added rich HTML `title` tooltips over key mathematical concepts (such as "Sharpe Ratio", "Idzorek's Method", "Adjusted Close", and "Value at Risk") within the methodology text, empowering expert users to audit the exact theoretical justifications of the model without cluttering the UI.

## Data Engine (Phase 3)
The data fetching and processing has been refactored into a custom hook `useMarketData.ts`. This engine ensures:
- **Robust State Management:** Exposes precise `isLoading`, `error`, and data states (like `pricesBySymbol` and `returnsBySymbol`) to the main application, enabling reactive UI loading states.
- **Data Integrity:** Strict preservation of `null` values for missing prices (e.g., market holidays) so the exact pairwise deletion logic during covariance and return calculation works flawlessly.
- **Graceful Error Handling:** Logs errors on individual failed tickers while still returning and structuring data for the surviving valid ones.
