# Quant Portfolio

Quantitative portfolio optimization web app: Markowitz (max Sharpe and minimum variance),
risk parity, hierarchical risk parity (HRP), Ledoit-Wolf shrinkage covariance, CAPM,
Black-Litterman with a market-cap prior, Monte Carlo, ARIMA forecasts, stress testing,
tail-risk metrics (Sortino, max drawdown, Calmar), transaction-cost estimates,
sentiment and asset recommendations.
Market data comes from Yahoo Finance; saved portfolios are stored in a local SQLite file (`portfolios.db`).

## Requirements

- **Node.js 20 or newer** (includes npm)
- Internet access to Yahoo Finance (`*.finance.yahoo.com`)

## Run (development)

```bash
npm install
npm run dev
```

Open http://localhost:3000, expand **Parameters & Asset Selection** and click
**Update Data & Run Optimization**.

To use another port: `PORT=4000 npm run dev` (on Windows PowerShell: `$env:PORT=4000; npm run dev`).

## Run (production)

```bash
npm run build
npm start
```

`npm run build` bundles the frontend into `dist/` and the server into `dist/server.cjs`;
`npm start` serves both on port 3000 (or `PORT`).

## Checks

```bash
npm run lint   # TypeScript type check
npm test       # Unit tests (Vitest)
```

GitHub Actions runs the type check, tests and build on every pull request.

## Code layout

| Path | Contents |
|---|---|
| `src/engine/` | Pure analysis pipeline: statistics, Ledoit-Wolf covariance, objectives (risk parity, HRP), risk metrics, trading costs, Black-Litterman, recommendations, chart data |
| `src/optimization.ts`, `src/qp.ts` | Exact max-Sharpe / min-variance optimizer (quadratic programming via `quadprog`) |
| `src/utils/quantMath.ts`, `src/advancedQuant.ts`, `src/monteCarlo.ts` | Core math |
| `src/worker/` | Web Worker that runs the analysis, Black-Litterman and Monte Carlo off the UI thread |
| `src/hooks/` | React state: parameters, market data, analysis, server data, UI state, theme |
| `src/i18n/` | Spanish/English text and locale-aware number formatting |
| `src/components/<tab>/` | One folder per tab (`dashboard`, `analytics`, `ai`, `validation`), plus `layout` and shared `ui` |
| `server.ts`, `server/` | Express API (Yahoo Finance, SQLite), price cache and static hosting |

## Caching

Daily prices are cached for 4 hours in `portfolios.db` (tables `price_history` and `price_fetches`),
so repeated runs don't call Yahoo Finance again. The exchange rate is cached for 1 minute and company
metadata for 12 hours (in memory). Deleting the two price tables, or the whole file, clears the cache —
note that the file also holds your saved portfolios.

## Legacy Python prototype (optional)

`backend/` holds the original Streamlit prototype (Phase 1: data extraction only). It is not
used by the web app. Requires Python 3.10+:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
streamlit run main.py
```

## Troubleshooting

- **"Failed to fetch data for: …"**: Yahoo Finance could not be reached or the ticker does not exist.
  Check your connection and the ticker symbol (Chilean stocks use the `.SN` suffix, e.g. `SQM-B.SN`).
- **`better-sqlite3` install errors**: use Node 20/22/24 (prebuilt binaries exist for these);
  other versions need C++ build tools.
- **Saved portfolios disabled**: the server could not open `portfolios.db`; check file permissions
  or move the file aside. It is never deleted automatically.
