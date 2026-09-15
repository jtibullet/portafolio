import re

with open('src/App.tsx', 'r') as f:
    text = f.read()

# Add import
import_stmt = "import { useMarketData } from './hooks/useMarketData';"
if import_stmt not in text:
    text = text.replace("import { FactorInvestingWidget } from './components/FactorInvestingWidget';", "import { FactorInvestingWidget } from './components/FactorInvestingWidget';\n" + import_stmt)


# Replace state variables
old_state_vars = """  const [historicalData, setHistoricalData] = useState<any[] | null>(null);
  const [symbols, setSymbols] = useState<string[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);"""

new_state_vars = """  const { data: marketData, isLoading: dataLoading, error, fetchData: fetchMarketData, setError } = useMarketData();
  const historicalData = marketData?.historicalData || null;
  const symbols = marketData?.symbols || [];
  
  const [isOptimizing, setIsOptimizing] = useState(false);"""

text = text.replace(old_state_vars, new_state_vars)


# Replace handleFetchData
old_handle_fetch = """  const handleFetchData = async () => {
    if (selectedTickers.length === 0) {
      setError("Please select at least one asset in the sidebar.");
      return;
    }
    setError(null);
    setDataLoading(true);
    setHistoricalData(null);
    try {
      const res = await fetch('/api/historical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tickers: selectedTickers,
          benchmark: selectedBenchmark,
          horizonYears
        })
      });
      const resData = await res.json();
      if (resData.error) throw new Error(resData.error);
      if (resData.failedSymbols && resData.failedSymbols.length > 0) {
        setError(`Failed to fetch data for: ${resData.failedSymbols.join(', ')}`);
      }
      setHistoricalData(resData.data);
      setSymbols(resData.symbols);
    } catch (err: any) {
      setError(err.message || "Failed to load historical data. Please check the tickers and try again.");
    } finally {
      setDataLoading(false);
    }
  };"""

new_handle_fetch = """  const handleFetchData = () => {
    fetchMarketData(selectedTickers, selectedBenchmark, horizonYears);
  };"""

text = text.replace(old_handle_fetch, new_handle_fetch)


# Update the big useEffect 
old_use_effect_start = """  useEffect(() => {
    if (!historicalData || historicalData.length === 0 || symbols.length === 0) {
      setQuantStats(null);
      return;
    }
    const pricesBySymbol: Record<string, (number | null)[]> = {};
    const returnsBySymbol: Record<string, (number | null)[]> = {};
    for (const sym of symbols) {
      pricesBySymbol[sym] = historicalData.map(row => row[sym] === null ? null : Number(row[sym]));
      returnsBySymbol[sym] = calculateLogReturns(pricesBySymbol[sym]);
    }
    const benchReturns = returnsBySymbol[selectedBenchmark];"""

new_use_effect_start = """  useEffect(() => {
    if (!marketData || marketData.historicalData.length === 0 || marketData.symbols.length === 0) {
      setQuantStats(null);
      return;
    }
    setIsOptimizing(true);
    const { pricesBySymbol, returnsBySymbol } = marketData;
    const benchReturns = returnsBySymbol[selectedBenchmark];"""

text = text.replace(old_use_effect_start, new_use_effect_start)

# Update setDataLoading(false) to setIsOptimizing(false) inside calculateOpt
old_opt_end = """      setQuantStats({
        assetStats,
        matrixSymbols,
        covarianceMatrix: covMatrix,
        correlationMatrix: corMatrix,
        optimization: opt,
        portBeta,
        portCAPM,
        portAlpha,
        benchAnnReturn,
        portDailyReturns,
        benchDailyReturns: benchReturns,
        dates: historicalData.map(d => d.date)
      });
      setDataLoading(false);
    };"""

new_opt_end = """      setQuantStats({
        assetStats,
        matrixSymbols,
        covarianceMatrix: covMatrix,
        correlationMatrix: corMatrix,
        optimization: opt,
        portBeta,
        portCAPM,
        portAlpha,
        benchAnnReturn,
        portDailyReturns,
        benchDailyReturns: benchReturns,
        dates: marketData.historicalData.map(d => d.date)
      });
      setIsOptimizing(false);
    };"""

text = text.replace(old_opt_end, new_opt_end)

# Also update the dependency array of that useEffect
old_dep_array = "}, [historicalData, symbols, riskFreeRate, selectedTickers, selectedBenchmark, useArimaForecast, maxWeights, minWeights]);"
new_dep_array = "}, [marketData, riskFreeRate, selectedTickers, selectedBenchmark, useArimaForecast, maxWeights, minWeights]);"
text = text.replace(old_dep_array, new_dep_array)


# Replace setDataLoading(true) in calculateOpt
text = text.replace("setDataLoading(true);", "")

with open('src/App.tsx', 'w') as f:
    f.write(text)

