import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import vm from "node:vm";
import YahooFinanceRaw from "yahoo-finance2";
import Database from "better-sqlite3";
import fs from "fs";
import { subYears, subMonths, format } from "date-fns";

const YahooFinance = (YahooFinanceRaw as any).default || YahooFinanceRaw;
const yfOptions = { validation: { logErrors: false } };const yahooFinance = typeof YahooFinance === 'function' ? new YahooFinance(yfOptions) : new YahooFinance.default(yfOptions);
yahooFinance.suppressNotices = true;

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
});

let db;
try {
  db = new Database("portfolios.db");
  db.exec(`
    CREATE TABLE IF NOT EXISTS portfolios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      tickers TEXT,
      riskFreeRate REAL,
      expectedReturn REAL,
      volatility REAL,
      sharpeRatio REAL,
      weights TEXT
    )
  `);
} catch (err) {
  console.error("Failed to open portfolios.db, recreating it...", err);
  try { if (db) db.close(); } catch(e) {}
  try { if (fs.existsSync("portfolios.db")) fs.unlinkSync("portfolios.db"); } catch(e) {}
  try { if (fs.existsSync("portfolios.db-wal")) fs.unlinkSync("portfolios.db-wal"); } catch(e) {}
  try { if (fs.existsSync("portfolios.db-shm")) fs.unlinkSync("portfolios.db-shm"); } catch(e) {}
  
  db = new Database("portfolios.db");
  db.exec(`
    CREATE TABLE IF NOT EXISTS portfolios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      tickers TEXT,
      riskFreeRate REAL,
      expectedReturn REAL,
      volatility REAL,
      sharpeRatio REAL,
      weights TEXT
    )
  `);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/exchange-rate", async (req, res) => {
    try {
      const quote = await yahooFinance.quote("CLP=X", {}, { validateResult: false });
      res.json({ rate: quote.regularMarketPrice });
    } catch (error) {
      console.error("Exchange rate error:", error);
      res.status(500).json({ error: "Failed to fetch exchange rate" });
    }
  });

  app.post("/api/portfolios", (req, res) => {
    try {
      const { tickers, riskFreeRate, expectedReturn, volatility, sharpeRatio, weights } = req.body;
      const stmt = db.prepare(`
        INSERT INTO portfolios (tickers, riskFreeRate, expectedReturn, volatility, sharpeRatio, weights)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(
        JSON.stringify(tickers),
        riskFreeRate,
        expectedReturn,
        volatility,
        sharpeRatio,
        JSON.stringify(weights)
      );
      res.json({ success: true, id: info.lastInsertRowid });
    } catch (error) {
      console.error("Save portfolio error:", error);
      res.status(500).json({ error: "Failed to save portfolio" });
    }
  });

  app.get("/api/portfolios", (req, res) => {
    try {
      const stmt = db.prepare("SELECT * FROM portfolios ORDER BY timestamp DESC");
      const rows = stmt.all();
      const parsedRows = rows.map((row: any) => ({
        ...row,
        tickers: JSON.parse(row.tickers),
        weights: JSON.parse(row.weights)
      }));
      res.json({ portfolios: parsedRows });
    } catch (error) {
      console.error("Get portfolios error:", error);
      res.status(500).json({ error: "Failed to get portfolios" });
    }
  });


  
  app.post("/api/historical", async (req, res) => {
    try {
      const { tickers, benchmark, horizonYears } = req.body;
      
      const allSymbols = Array.from(new Set([...tickers, benchmark]));
      
      const endDate = new Date();
      const startDate = subYears(endDate, horizonYears);
      
      const period1 = format(startDate, "yyyy-MM-dd");
      const period2 = format(endDate, "yyyy-MM-dd");

      const results: any = {};
      
      for (const symbol of allSymbols) {
        try {
          let result = null;
          let attempts = 0;
          let lastError = null;
          
          while (attempts < 3 && !result) {
            try {
              const chartRes = await yahooFinance.chart(symbol as string, {
                period1,
                period2,
                interval: "1d"
              }, { validateResult: false });
              
              if (chartRes && chartRes.quotes) {
                // map to historical format
                result = chartRes.quotes.map((q: any) => ({
                    date: q.date,
                    open: q.open,
                    high: q.high,
                    low: q.low,
                    close: q.close,
                    adjClose: q.adjclose,
                    volume: q.volume
                })).filter((q: any) => q.close != null && q.adjClose != null);
              } else {
                  throw new Error("No quotes returned");
              }
            } catch (e: any) {
                lastError = e;
                attempts++;
                if (attempts < 3) {
                    await new Promise(r => setTimeout(r, 1000 * attempts));
                }
            }
          }
          
          if (result) {
            results[symbol as string] = result;
          } else {
            console.log(`Warning: Could not fetch ${symbol} - ${lastError?.message}`);
          }
        } catch (e: any) {
          console.log(`Warning: Unhandled error fetching ${symbol} - ${e.message}`);
        }
      }
      
      const successfulSymbols = Object.keys(results);
      
      // Collect all unique trading dates from the raw data
      const allDates = new Set<string>();
      const pricesBySymbol: Record<string, Record<string, number>> = {};
      
      for (const symbol of successfulSymbols) {
          pricesBySymbol[symbol as string] = {};
          for (const row of results[symbol as string]) {
              const dateStr = format(row.date, "yyyy-MM-dd");
              pricesBySymbol[symbol as string][dateStr] = row.adjClose;
              allDates.add(dateStr);
          }
      }
      
      const sortedDates = Array.from(allDates).sort();
      
      // 3. Align on the union of trading dates (Strict pairwise deletion support - no forward fill)
      // DO NOT drop rows, leave missing days as null.
      const data: any[] = [];
      for (const dateStr of sortedDates) {
          const row: any = { date: dateStr };
          for (const symbol of successfulSymbols) {
              const sym = symbol as string;
              if (pricesBySymbol[sym][dateStr] !== undefined) {
                  row[sym] = pricesBySymbol[sym][dateStr];
              } else {
                  row[sym] = null;
              }
          }
          data.push(row);
      }

      const failedSymbols = allSymbols.filter(s => !successfulSymbols.includes(s as string));

      res.json({ data, symbols: successfulSymbols, failedSymbols });
    } catch (error) {
      console.error("Historical data error:", error);
      res.status(500).json({ error: "Failed to fetch historical data" });
    }
  });

  app.post("/api/metadata", async (req, res) => {
    try {
      const { tickers } = req.body;
      const promises = tickers.map(async (symbol: any) => {
        try {
          let price: any = {};
          let summary: any = {};
          let quoteType: any = {};
          let fundProfile: any = {};
          let financialData: any = {};
          let defaultKeyStatistics: any = {};
          let summaryDetail: any = {};
          
          try {
            const profile = await yahooFinance.quoteSummary(symbol as string, { modules: ["price", "summaryProfile", "quoteType", "fundProfile", "financialData", "defaultKeyStatistics", "summaryDetail"] }, { validateResult: false });
            price = profile.price || {};
            summary = profile.summaryProfile || {};
            quoteType = profile.quoteType || {};
            fundProfile = profile.fundProfile || {};
            financialData = profile.financialData || {};
            defaultKeyStatistics = profile.defaultKeyStatistics || {};
            summaryDetail = profile.summaryDetail || {};
          } catch (e: any) {
            console.log(`Could not fetch full quoteSummary for ${symbol}, falling back to basic quote`, e.message);
            const q = await yahooFinance.quote(symbol as string, {}, { validateResult: false });
            price = q || {};
            quoteType = q || {};
          }
          
          let sector = summary.sector;
          if (!sector && quoteType.quoteType === 'ETF') {
            sector = fundProfile.categoryName || "ETF / Fondo";
          }
          if (!sector) {
            sector = "Variado";
          }
          
          const currentPrice = price.regularMarketPrice || null;
          const targetMeanPrice = financialData.targetMeanPrice || null;
          let expectedGrowth = null;
          if (currentPrice !== null && targetMeanPrice !== null && currentPrice > 0) {
            expectedGrowth = ((targetMeanPrice - currentPrice) / currentPrice) * 100;
          }
          
          const longName = price.longName || price.shortName || symbol;
          const exchange = price.exchange || "";
          
          const baseSymbol = (symbol as string).split('.')[0];
          let racionalTicker = baseSymbol;
          
          let lsegTicker = `${symbol}`;
          if (["NMS", "Nasdaq", "NCM", "NGM"].includes(exchange)) {
            lsegTicker = `XNAS:${baseSymbol}`;
          } else if (["NYQ", "NYSE"].includes(exchange)) {
            lsegTicker = `XNYS:${baseSymbol}`;
          } else if (["PCX", "BATS", "BZX", "ARCX"].includes(exchange)) {
            lsegTicker = `ARCX:${baseSymbol}`;
          } else if (["SGO", "Santiago"].includes(exchange) || (symbol as string).endsWith('.SN')) {
            lsegTicker = `XSGO:${baseSymbol}`;
          }

          let description = [summary.sector, summary.industry].filter(Boolean).join(" - ");
          if (summary.longBusinessSummary) {
            const firstSentence = summary.longBusinessSummary.split(". ")[0] + ".";
            description += description ? ` | ${firstSentence}` : firstSentence;
          }


          const totalAssets = summaryDetail.totalAssets || defaultKeyStatistics.totalAssets || null;
          const categoryName = fundProfile.categoryName || null;
          const quoteTypeStr = quoteType.quoteType || null;
          const marketCap = price.marketCap || summaryDetail.marketCap || null;
          const trailingPE = summaryDetail.trailingPE || null;
          const forwardPE = summaryDetail.forwardPE || defaultKeyStatistics.forwardPE || null;
          const priceToBook = defaultKeyStatistics.priceToBook || null;
          const returnOnEquity = financialData.returnOnEquity || null;
          const profitMargins = financialData.profitMargins || defaultKeyStatistics.profitMargins || null;

          return {
            symbol,
            totalAssets,
            categoryName,
            quoteTypeStr,
            marketCap,
            trailingPE,
            forwardPE,
            priceToBook,
            returnOnEquity,
            profitMargins,
            nameAndDesc: `${longName} - ${description}`,
            racionalTicker,
            yahooTicker: symbol,
            lsegTicker,
            sector,
            currentPrice,
            targetMeanPrice,
            expectedGrowth,
          };
        } catch (e: any) {
          console.log(`Could not fetch metadata for ${symbol}: ${e.message}`);
          return {
            symbol,
            totalAssets: null,
            categoryName: null,
            quoteTypeStr: null,
            marketCap: null,
            trailingPE: null,
            forwardPE: null,
            priceToBook: null,
            returnOnEquity: null,
            profitMargins: null,
            nameAndDesc: "Data not available",
            racionalTicker: (symbol as string).split('.')[0],
            yahooTicker: symbol,
            lsegTicker: "N/A",
            sector: "Variado",
            currentPrice: null,
            targetMeanPrice: null,
            expectedGrowth: null,
          };
        }
      });
      const results = await Promise.all(promises);
      res.json({ metadata: results });
    } catch (error) {
      console.error("Metadata error:", error);
      res.status(500).json({ error: "Failed to fetch metadata" });
    }
  });

  const CANDIDATE_UNIVERSE = [
    // Top NASDAQ stocks (NASDAQ-100 representativo para evitar limites de API)
    "AAPL", "MSFT", "AMZN", "NVDA", "META", "TSLA", "GOOGL", "GOOG", "AVGO", "PEP", "COST", "CSCO", "TMUS", "ADBE", "TXN", "NFLX", "AMD", "INTC", "QCOM", "AMGN", "HON", "INTU", "ISRG", "SBUX", "BKNG", "MDLZ", "GILD", "ADP", "AMAT", "ADI", "VRTX", "REGN", "PANW", "MU", "MELI", "SNPS", "CDNS", "KLAC", "PYPL", "MAR", "CSX", "ASML", "ORLY", "MNST", "CTAS", "FTNT", "AEP", "KDP", "PAYX", "MCHP", "DXCM", "KHC", "EXC", "EA", "BIIB", "AZN", "ILMN", "FAST", "DLTR", "WBA", "IDXX", "VRSK", "ODFL", "ROST", "CPRT", "PCAR", "EBAY", "WBD", "SIRI", "ZM", "ZS", "CRWD", "DDOG", "TEAM", "OKTA",
    // S&P IPSA (Acciones de Chile, sufijo .SN)
    "SQM-B.SN", "CHILE.SN", "BCI.SN", "BSANTANDER.SN", "ENELAM.SN", "COPEC.SN", "CMPC.SN", "FALABELLA.SN", "CENCOSUD.SN", "ENELCHILE.SN", "LTM.SN", "CCU.SN", "PARAUCO.SN", "SMU.SN", "AGUAS-A.SN", "IAM.SN", "ENTEL.SN", "COLBUN.SN", "ITAUCL.SN", "MALLPLAZA.SN", "VAPORES.SN", "RIPLEY.SN", "CAP.SN", "SALFACORP.SN", "ANDINA-B.SN",
    // Principales ETFs USA
    "SPY", "IVV", "VOO", "QQQ", "DIA", "IWM", "VTI", "VEA", "VWO", "GLD", "TLT", "ARKK", "VNQ",
    // Principales ETFs Chile
    "ECH", "CHIL"
  ];
  let recommendationsCache: any = null;
  let recommendationsCacheTime = 0;

  app.get("/api/recommendations", async (req, res) => {
    try {
      if (recommendationsCache && Date.now() - recommendationsCacheTime < 1000 * 60 * 60 * 12) {
        return res.json({ candidates: recommendationsCache });
      }

      const endDate = new Date();
      const startDate = subMonths(endDate, 6);
      const period1 = format(startDate, "yyyy-MM-dd");
      const period2 = format(endDate, "yyyy-MM-dd");

      const candidatesData: any[] = [];
      const batchSize = 10;
      
      for (let i = 0; i < CANDIDATE_UNIVERSE.length; i += batchSize) {
        const batch = CANDIDATE_UNIVERSE.slice(i, i + batchSize);
        const promises = batch.map(async (symbol) => {
          try {
            let result = [];
            try {
              const chartRes = await yahooFinance.chart(symbol, { period1, period2, interval: "1d" }, { validateResult: false });
              if (chartRes && chartRes.quotes) {
                result = chartRes.quotes.map((q: any) => ({
                    date: q.date,
                    adjClose: q.adjclose
                })).filter((q: any) => q.adjClose != null);
              }
            } catch (e: any) {
              console.log(`Could not fetch chart for ${symbol}`);
              return null;
            }
            if (result.length === 0) return null;
            
            const profile = await yahooFinance.quoteSummary(symbol, { modules: ["financialData", "price"] }, { validateResult: false }).catch(() => ({}));
            const currentPrice = profile.price?.regularMarketPrice || result[result.length - 1].adjClose;
            const targetMeanPrice = profile.financialData?.targetMeanPrice || null;
            
            let expectedGrowth = 0;
            if (targetMeanPrice && currentPrice) {
              expectedGrowth = (targetMeanPrice - currentPrice) / currentPrice;
            }
            
            const pricesByDate: Record<string, number> = {};
            for (const row of result) {
              const dateStr = format(row.date, "yyyy-MM-dd");
              pricesByDate[dateStr] = row.adjClose;
            }
            
            // Calculate metrics for recommendations
            let sixMonthHigh = -Infinity;
            for (const row of result) {
              if (row.adjClose > sixMonthHigh) sixMonthHigh = row.adjClose;
            }
            
            const drawdown = (currentPrice - sixMonthHigh) / sixMonthHigh;
            
            // Momentum 20D
            const lookback = Math.min(20, result.length - 1);
            let momentum20D = 0;
            if (lookback > 0) {
              const oldPrice = result[result.length - 1 - lookback].adjClose;
              momentum20D = (currentPrice - oldPrice) / oldPrice;
            }

            return {
               symbol,
               currentPrice,
               sixMonthHigh,
               drawdown,
               momentum20D,
               pricesByDate,
            };
          } catch (e) {
            console.log(`Failed to fetch recommendation data for ${symbol}:`, e);
            return null;
          }
        });
        
        const results = await Promise.all(promises);
        candidatesData.push(...results.filter(Boolean));
      }
      
      recommendationsCache = candidatesData;
      recommendationsCacheTime = Date.now();
      
      res.json({ candidates: candidatesData });
    } catch (error) {
      console.error("Recommendations error:", error);
      res.status(500).json({ error: "Failed to fetch recommendations" });
    }
  });

  app.get("/api/sentiment", async (req, res) => {
    try {
      const { tickers } = req.query;
      if (!tickers || typeof tickers !== "string") {
        return res.status(400).json({ error: "tickers query parameter is required" });
      }
      const symbols = tickers.split(",");
      const sentiment = (await import('vader-sentiment')).default;
      
      const results = [];
      for (const symbol of symbols) {
        try {
          const searchRes = await yahooFinance.search(symbol, { newsCount: 3 }, { validateResult: false });
          const news = searchRes.news || [];
          
          if (news.length === 0) {
            results.push({
              symbol,
              score: 50,
              news: []
            });
            continue;
          }
          
          let totalCompound = 0;
          let totalWeight = 0;
          const formattedNews = [];
          
          const now = new Date();
          
          for (const item of news) {
            let text = item.title;
            if (item.publisher) text += " " + item.publisher;
            
            const intensity = sentiment.SentimentIntensityAnalyzer.polarity_scores(text);
            
            // Exponential time-decay factor (half-life of 24 hours)
            let decayFactor = 1;
            if (item.providerPublishTime) {
              const pubDate = new Date(item.providerPublishTime);
              const hoursDiff = (now.getTime() - pubDate.getTime()) / (1000 * 60 * 60);
              // Max difference capped to prevent negative or extreme values if dates are off
              const boundedHours = Math.max(0, hoursDiff);
              decayFactor = Math.exp(-0.0289 * boundedHours);
            }
            
            totalCompound += intensity.compound * decayFactor;
            totalWeight += decayFactor;
            
            formattedNews.push({
              title: item.title,
              link: item.link,
              publisher: item.publisher,
              providerPublishTime: item.providerPublishTime
            });
          }
          
          const avgCompound = totalWeight > 0 ? totalCompound / totalWeight : 0;
          let normalizedScore = Math.round((avgCompound + 1) * 50);
          normalizedScore = Math.max(0, Math.min(100, normalizedScore));
          
          results.push({
            symbol,
            score: normalizedScore,
            news: formattedNews
          });
          
        } catch (e: any) {
          console.log(`Failed to fetch sentiment for ${symbol}: ${e.message}`);
          results.push({
            symbol,
            score: 50,
            news: []
          });
        }
      }
      
      res.json({ sentiment: results });
    } catch (error) {
      console.error("Sentiment error:", error);
      res.status(500).json({ error: "Failed to fetch sentiment" });
    }
  });



  

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
