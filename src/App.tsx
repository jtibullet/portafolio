import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { Settings, BarChart2, DollarSign, Loader2, ArrowRight, ChevronDown, ChevronRight, Printer, Download, FileSpreadsheet, FileJson } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { calculateLogReturns, mean, stdDev, covariance, correlation, calculateBeta, calculateCAPM, calculateJensensAlpha, variance, calculateARIMA111, type ARIMA_Forecast, calculateAlphaSignal, type AlphaSignalResult, calculateBlackLittermanPosterior } from './utils/quantMath';
import { optimizePortfolio, OptimizationResult, FrontierPoint } from './optimization';
import { calculateBlackLitterman, simulateBlackSwan } from './advancedQuant';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Line, Cell, PieChart, Pie, Legend, BarChart, Bar, AreaChart, Area, LineChart, ReferenceLine } from 'recharts';
import { interpolateBlues, interpolatePlasma } from 'd3-scale-chromatic';
import { runMonteCarlo, MonteCarloResult } from './monteCarlo';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FactorInvestingWidget } from './components/FactorInvestingWidget';
import { useMarketData } from './hooks/useMarketData';
import { EfficientFrontier } from './components/EfficientFrontier';
import { CorrelationHeatmap } from './components/CorrelationHeatmap';
import { AssetRecommendations } from './components/AssetRecommendations';


function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DEFAULT_TICKERS = ['NBIS', 'PCAR', 'NVO', 'WTM', 'SGOV', 'AEP', 'VRTX'];
const BENCHMARKS = ['ACWI', 'SPY', 'QQQ', 'DIA', 'ECH'];
const HORIZON_OPTIONS = [
  { label: '1 Year', value: 1 },
  { label: '3 Years', value: 3 },
  { label: '5 Years', value: 5 },
];

const POPULAR_TICKERS = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corp.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.' },
  { symbol: 'META', name: 'Meta Platforms' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'BRK-B', name: 'Berkshire Hathaway' },
  { symbol: 'JNJ', name: 'Johnson & Johnson' },
  { symbol: 'V', name: 'Visa Inc.' },
  { symbol: 'PG', name: 'Procter & Gamble' },
  { symbol: 'JPM', name: 'JPMorgan Chase' },
  { symbol: 'UNH', name: 'UnitedHealth Group' },
  { symbol: 'MA', name: 'Mastercard Inc.' },
  { symbol: 'HD', name: 'Home Depot' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust' },
  { symbol: 'VTI', name: 'Vanguard Total Stock Mkt ETF' },
  { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond' },
  { symbol: 'GLD', name: 'SPDR Gold Shares' },
  { symbol: 'ACWI', name: 'iShares MSCI ACWI ETF' },
  { symbol: 'DIA', name: 'SPDR Dow Jones Industrial Average ETF' },
  { symbol: 'IAU', name: 'iShares Gold Trust' },
  { symbol: 'XLK', name: 'Technology Select Sector SPDR Fund' },
  { symbol: 'LLY', name: 'Eli Lilly and Co' },
  { symbol: 'USCI', name: 'United States Commodity Index Fund' },
  { symbol: 'MU', name: 'Micron Technology' },
  { symbol: 'ITA', name: 'iShares U.S. Aerospace & Defense ETF' }
];



function SortableWidget({ id, children, className, size, onSizeChange }: { id: string, children: React.ReactNode, className?: string, key?: any, size?: number, onSizeChange?: (size: number) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as const,
    touchAction: 'none',
  };
  return (
    <div ref={setNodeRef} style={style} className={className}>
      <div className="absolute top-0 right-0 p-1 mt-1 mr-1 z-10 opacity-0 hover:opacity-100 transition-opacity flex items-center gap-1 bg-white border border-zinc-300">
        {onSizeChange && (
          <div className="flex items-center gap-1 pr-1 border-r border-zinc-300">
            <button onClick={() => onSizeChange(2)} title="1/3 Width" className={`px-1 text-[9px] font-mono hover:text-[#141414] ${size === 2 ? 'text-blue-600 font-bold' : 'text-zinc-400'}`}>1/3</button>
            <button onClick={() => onSizeChange(3)} title="1/2 Width" className={`px-1 text-[9px] font-mono hover:text-[#141414] ${size === 3 ? 'text-blue-600 font-bold' : 'text-zinc-400'}`}>1/2</button>
            <button onClick={() => onSizeChange(4)} title="2/3 Width" className={`px-1 text-[9px] font-mono hover:text-[#141414] ${size === 4 ? 'text-blue-600 font-bold' : 'text-zinc-400'}`}>2/3</button>
            <button onClick={() => onSizeChange(6)} title="Full Width" className={`px-1 text-[9px] font-mono hover:text-[#141414] ${size === 6 ? 'text-blue-600 font-bold' : 'text-zinc-400'}`}>Max</button>
          </div>
        )}
        <div {...attributes} {...listeners} className="cursor-grab text-zinc-400 hover:text-[#141414] px-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function App() {
  const [selectedTickers, setSelectedTickers] = useState<string[]>(DEFAULT_TICKERS);
  const [customTicker, setCustomTicker] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const filteredTickers = POPULAR_TICKERS.filter(t => 
    t.symbol.toLowerCase().includes(customTicker.toLowerCase()) || 
    t.name.toLowerCase().includes(customTicker.toLowerCase())
  ).slice(0, 8);
  const [selectedBenchmark, setSelectedBenchmark] = useState('ACWI');
  const [horizonYears, setHorizonYears] = useState(5);
  const [riskFreeRate, setRiskFreeRate] = useState(0.04);
  
  const [useArimaForecast, setUseArimaForecast] = useState(false);
  const [arimaForecasts, setArimaForecasts] = useState<Record<string, ARIMA_Forecast>>({});
  const [selectedArimaTicker, setSelectedArimaTicker] = useState<string | null>(null);
  const [isArimaExpanded, setIsArimaExpanded] = useState(false);
  
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState(false);
  
  const { data: marketData, isLoading: isFetching, error, fetchData: fetchMarketData, setError } = useMarketData();
  const [isOptimizing, setIsOptimizing] = useState(false);
  const dataLoading = isFetching || isOptimizing;
  const historicalData = marketData?.historicalData || null;
  const symbols = marketData?.symbols || [];
  const [dashboardWidgets, setDashboardWidgets] = useState<string[]>(() => {
    const saved = localStorage.getItem('dashboardWidgets');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return ['coreMetrics', 'historicalBacktester', 'correlationHeatmap', 'optimalWeights', 'efficientFrontier', 'sectorBreakdown', 'portfolioMetrics', 'factorInvesting'];
  });

  const [widgetSizes, setWidgetSizes] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('widgetSizes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      coreMetrics: 3,
      historicalBacktester: 3,
      correlationHeatmap: 3,
      optimalWeights: 2,
      efficientFrontier: 4,
      sectorBreakdown: 6,
      portfolioMetrics: 6,
      factorInvesting: 6
    };
  });

  useEffect(() => {
    localStorage.setItem('dashboardWidgets', JSON.stringify(dashboardWidgets));
  }, [dashboardWidgets]);

  useEffect(() => {
    localStorage.setItem('widgetSizes', JSON.stringify(widgetSizes));
  }, [widgetSizes]);
  
  const [quantStats, setQuantStats] = useState<any | null>(null);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'analytics' | 'ai' | 'validation'>('dashboard');
  const [viewsData, setViewsData] = useState<Record<string, { view: number, conf: number }>>({});
  const [maxWeights, setMaxWeights] = useState<Record<string, number>>({});
  const [minWeights, setMinWeights] = useState<Record<string, number>>({});
  const [blStats, setBlStats] = useState<any | null>(null);
  const [metadata, setMetadata] = useState<any[] | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [sentimentData, setSentimentData] = useState<any[] | null>(null);
  const [sentimentLoading, setSentimentLoading] = useState(false);
  const [isSentimentExpanded, setIsSentimentExpanded] = useState(true);
    const [isAlphaExecutionExpanded, setIsAlphaExecutionExpanded] = useState(false);
  const [alphaExecutionSelectedTicker, setAlphaExecutionSelectedTicker] = useState<string | null>(null);
  const [alphaSignals, setAlphaSignals] = useState<Record<string, AlphaSignalResult>>({});
    
  

  

    

  const [mcYears, setMcYears] = useState<number>(5);
  const [mcInitialAmount, setMcInitialAmount] = useState<number>(100000);
  const [mcResult, setMcResult] = useState<MonteCarloResult | null>(null);


  const [investmentCapital, setInvestmentCapital] = useState<number>(100000);
  const [currentHoldings, setCurrentHoldings] = useState<Record<string, number>>({});
  const [investmentCurrency, setInvestmentCurrency] = useState<'USD' | 'CLP'>('USD');
  const [savingPortfolio, setSavingPortfolio] = useState(false);
  const [savedPortfolios, setSavedPortfolios] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showInvestmentCalculator, setShowInvestmentCalculator] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

    const getColSpanClass = (size: number) => {
    switch (size) {
      case 2: return "lg:col-span-2";
      case 3: return "lg:col-span-3";
      case 4: return "lg:col-span-4";
      case 6: return "lg:col-span-6";
      default: return "lg:col-span-3";
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setDashboardWidgets((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const [isParamsExpanded, setIsParamsExpanded] = useState(false);
  const [isSectorBreakdownOpen, setIsSectorBreakdownOpen] = useState(true);
  const [recommendations, setRecommendations] = useState<{growth: any[], dip: any[]} | null>(null);
  const [isRecommendationsLoading, setIsRecommendationsLoading] = useState(false);
  const [isRecommendationsExpanded, setIsRecommendationsExpanded] = useState(false);
  const [isAnalystTargetsExpanded, setIsAnalystTargetsExpanded] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);

  useEffect(() => {
    async function fetchPortfolios() {
      try {
        const res = await fetch('/api/portfolios');
        const data = await res.json();
        if (data.portfolios) {
          setSavedPortfolios(data.portfolios);
        }
      } catch (err) {
        console.error('Failed to fetch portfolios', err);
      }
    }
    fetchPortfolios();
  }, []);

  const handleSavePortfolio = async () => {
    if (!quantStats || !quantStats.optimization) return;
    setSavingPortfolio(true);
    try {
      const res = await fetch('/api/portfolios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tickers: quantStats.matrixSymbols,
          riskFreeRate: riskFreeRate,
          expectedReturn: quantStats.optimization.optimal.expectedReturn,
          volatility: quantStats.optimization.optimal.volatility,
          sharpeRatio: quantStats.optimization.optimal.sharpeRatio,
          weights: quantStats.optimization.optimal.weights
        })
      });
      if (res.ok) {
        alert("Portfolio saved successfully!");
        const fetchRes = await fetch('/api/portfolios');
        const data = await fetchRes.json();
        if (data.portfolios) {
          setSavedPortfolios(data.portfolios);
        }
      }
    } catch (err) {
      console.error('Failed to save portfolio', err);
      alert("Failed to save portfolio");
    } finally {
      setSavingPortfolio(false);
    }
  };

  useEffect(() => {
    async function fetchExchangeRate() {
      try {
        const res = await fetch('/api/exchange-rate');
        const data = await res.json();
        if (data.rate) setExchangeRate(data.rate);
      } catch (err) {
        console.error('Failed to fetch exchange rate', err);
      } finally {
        setRateLoading(false);
      }
    }
    
    setRateLoading(true);
    fetchExchangeRate();
    const intervalId = setInterval(fetchExchangeRate, 10000); // 10 seconds
    
    return () => clearInterval(intervalId);
  }, []);


  
  

  const handleFetchData = () => {
    fetchMarketData(selectedTickers, selectedBenchmark, horizonYears);
  };

  const addTicker = (tickerToAdd?: string) => {
    const trimmed = (tickerToAdd || customTicker).trim();
    if (trimmed && !selectedTickers.includes(trimmed.toUpperCase())) {
      if (selectedTickers.length >= 7) {
        alert("Maximum of 7 assets allowed.");
        return;
      }
      setSelectedTickers([...selectedTickers, trimmed.toUpperCase()]);
      setCustomTicker('');
      setShowSuggestions(false);
    }
  };

  const removeTicker = (ticker: string) => {
    setSelectedTickers(selectedTickers.filter(t => t !== ticker));
  };

  // Keep track of the last fetched metadata tickers to avoid refetching
  const [lastFetchedMetadataTickers, setLastFetchedMetadataTickers] = useState<string>('');

  
  useEffect(() => {
    if (activeTab === 'analytics' && quantStats?.optimization?.optimal) {
      const expectedReturn = quantStats.optimization.optimal.expectedReturn;
      const volatility = quantStats.optimization.optimal.volatility;
      
      const runMC = async () => {
        setMcResult(null); // Show loading state if needed
        const result = await runMonteCarlo(mcInitialAmount, expectedReturn, volatility, mcYears);
        setMcResult(result);
      };
      runMC();
    }
  }, [activeTab, quantStats, mcYears, mcInitialAmount]);


  useEffect(() => {
    const currentTickersStr = [...selectedTickers, selectedBenchmark].sort().join(',');
    if (currentTickersStr !== lastFetchedMetadataTickers && currentTickersStr !== '') {
      setMetadataLoading(true);
      fetch('/api/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers: [...new Set([...selectedTickers, selectedBenchmark])] })
      })
        .then(res => res.json())
        .then(data => {
          if (data.metadata) {
            setMetadata(data.metadata);
            setLastFetchedMetadataTickers(currentTickersStr);
          }
        })
        .catch(err => console.error("Failed to fetch metadata:", err))
        .finally(() => setMetadataLoading(false));
    }
  }, [selectedTickers, selectedBenchmark, lastFetchedMetadataTickers]);

  const [lastFetchedSentimentTickers, setLastFetchedSentimentTickers] = useState<string>('');

  useEffect(() => {
    const currentTickersStr = [...selectedTickers].sort().join(',');
    if (currentTickersStr !== '' && activeTab === 'ai' && currentTickersStr !== lastFetchedSentimentTickers) {
      setLastFetchedSentimentTickers(currentTickersStr);
      setSentimentLoading(true);
      fetch(`/api/sentiment?tickers=${[...new Set(selectedTickers)].join(',')}`)
        .then(res => res.json())
        .then(data => {
          if (data.sentiment) {
            setSentimentData(data.sentiment);
          }
        })
        .catch(err => console.error("Failed to fetch sentiment:", err))
        .finally(() => setSentimentLoading(false));
    }
  }, [selectedTickers, activeTab]);

  useEffect(() => {
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

    const benchReturns = returnsBySymbol[selectedBenchmark];
    if (!benchReturns) return;

    const benchMeanDaily = mean(benchReturns);
    const benchAnnReturn = benchMeanDaily * 252;

    const assetStats = [];
    for (const sym of selectedTickers) {
      const r = returnsBySymbol[sym];
      if (!r) continue;

      const dailyMean = mean(r);
      const annReturn = dailyMean * 252;
      
      const dailyStd = stdDev(r, true);
      const annVolatility = dailyStd * Math.sqrt(252);
      
      const beta = calculateBeta(r, benchReturns);
      const capmReturn = calculateCAPM(riskFreeRate, beta, benchAnnReturn);
      const alpha = calculateJensensAlpha(annReturn, capmReturn);
      const sharpeRatio = annVolatility === 0 ? 0 : (annReturn - riskFreeRate) / annVolatility;

      assetStats.push({
        symbol: sym,
        annReturn,
        annVolatility,
        beta,
        capmExpectedReturn: capmReturn,
        alpha,
        sharpeRatio
      });
    }

    const matrixSymbols = selectedTickers.filter(sym => returnsBySymbol[sym]);
    const covMatrix: number[][] = [];
    const corMatrix: number[][] = [];

    for (let i = 0; i < matrixSymbols.length; i++) {
      covMatrix[i] = [];
      corMatrix[i] = [];
      for (let j = 0; j < matrixSymbols.length; j++) {
        const r1 = returnsBySymbol[matrixSymbols[i]];
        const r2 = returnsBySymbol[matrixSymbols[j]];
        
        const cov = covariance(r1, r2, true);
        covMatrix[i][j] = cov * 252;
        corMatrix[i][j] = correlation(r1, r2);
      }
    }

    let expectedReturns = assetStats.map(s => s.annReturn);
    
    // ARIMA Module
    let forecasts: Record<string, ARIMA_Forecast> = {};
    if (useArimaForecast) {
      for (let i = 0; i < matrixSymbols.length; i++) {
        const sym = matrixSymbols[i];
        try {
          const validPrices = pricesBySymbol[sym].filter(p => p !== null) as number[];
          const forecast = calculateARIMA111(validPrices, 252);
          forecast.symbol = sym;
          forecasts[sym] = forecast;
          expectedReturns[i] = forecast.expectedReturn;
        } catch (e) {
          console.log(`ARIMA forecast failed for ${sym}, falling back to historical mean.`, e);
          // fallback is already in expectedReturns[i]
        }
      }
      
      // BLACK-LITTERMAN POSTERIOR UPDATE
      try {
        const numAssets = matrixSymbols.length;
        // Naive prior uses equal weights for the market portfolio
        const marketWeights = new Array(numAssets).fill(1 / numAssets);
        // Q = The ARIMA expected returns
        const Q = [...expectedReturns];
        // P = Identity matrix (absolute views on every asset)
        const P = Array.from({length: numAssets}, (_, i) => 
          Array.from({length: numAssets}, (_, j) => i === j ? 1 : 0)
        );
        
        // Stabilize ARIMA returns with the Bayesian posterior
        expectedReturns = calculateBlackLittermanPosterior(
          covMatrix,
          marketWeights,
          Q,
          P,
          2.5, // Standard Institutional Risk Aversion (δ)
          0.05 // Standard Uncertainty Scalar (τ)
        );
      } catch (err) {
        console.error("Black-Litterman stabilization failed", err);
      }
      
      setArimaForecasts(forecasts);
    } else {
      setArimaForecasts({});
    }

    // Alpha Signals
    const signals: Record<string, AlphaSignalResult> = {};
    for (const sym of matrixSymbols) {
      if (pricesBySymbol[sym]) {
        const vp = pricesBySymbol[sym].filter(p => p !== null) as number[];
        signals[sym] = calculateAlphaSignal(sym, vp);
      }
    }
    setAlphaSignals(signals);
    setAlphaExecutionSelectedTicker(prev => prev ? prev : matrixSymbols[0]);


    const calculateOpt = async () => {
      let opt = null;
      let portBeta = 0;
      let portCAPM = 0;
      let portAlpha = 0;
      let portDailyReturns: (number | null)[] = [];

      try {
        // setIsOptimizing is already true
        const maxWeightsArr = matrixSymbols.map(sym => maxWeights[sym] !== undefined ? maxWeights[sym] : 1.0);
        const minWeightsArr = matrixSymbols.map(sym => minWeights[sym] !== undefined ? minWeights[sym] : 0.05);
        opt = await optimizePortfolio(expectedReturns, covMatrix, riskFreeRate, 100000, undefined, maxWeightsArr, minWeightsArr);
        
        const weights = opt.optimal.weights;
        portBeta = assetStats.reduce((sum, stat, i) => sum + stat.beta * weights[i], 0);
        portCAPM = calculateCAPM(riskFreeRate, portBeta, benchAnnReturn);
        portAlpha = calculateJensensAlpha(opt.optimal.expectedReturn, portCAPM);
        
        const nDays = returnsBySymbol[matrixSymbols[0]].length;
        for (let i = 0; i < nDays; i++) {
          let r: number | null = 0;
          let valid = true;
          for (let j = 0; j < matrixSymbols.length; j++) {
            if (returnsBySymbol[matrixSymbols[j]][i] === null) {
              valid = false;
              break;
            } else {
              r! += weights[j] * (returnsBySymbol[matrixSymbols[j]][i] as number);
            }
          }
          portDailyReturns.push(valid ? r : null);
        }
      } catch (e) {
        console.log("Could not optimize portfolio", e);
      }

      setQuantStats({
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
    };
    calculateOpt();
  }, [marketData, riskFreeRate, selectedTickers, selectedBenchmark, useArimaForecast, maxWeights, minWeights]);

  // Initialize Views Data
  useEffect(() => {
    if (quantStats) {
      setViewsData(prev => {
        const newViews = { ...prev };
        let changed = false;
        quantStats.matrixSymbols.forEach((sym: string, i: number) => {
          if (!newViews[sym]) {
             newViews[sym] = { view: quantStats.assetStats[i].annReturn, conf: 0.5 };
             changed = true;
          }
        });
        return changed ? newViews : prev;
      });
    }
  }, [quantStats]);

  // AI Asset Recommendations
  useEffect(() => {
    if (!quantStats || !quantStats.portDailyReturns || quantStats.portDailyReturns.length === 0) return;
    
    async function fetchRecommendations() {
      setIsRecommendationsLoading(true);
      try {
        const res = await fetch("/api/recommendations");
        const data = await res.json();
        
        if (data.candidates && data.candidates.length > 0) {
          const portfolioDates = quantStats.dates;
          const portfolioReturns = quantStats.portDailyReturns;
          
          const evaluated = data.candidates.map((candidate: any) => {
            const alignedCandidateReturns: number[] = [];
            const alignedPortReturns: number[] = [];
            
            for (let i = 1; i < portfolioDates.length; i++) {
              const date1 = portfolioDates[i-1];
              const date2 = portfolioDates[i];
              if (candidate.pricesByDate[date1] && candidate.pricesByDate[date2]) {
                const ret = Math.log(candidate.pricesByDate[date2] / candidate.pricesByDate[date1]);
                alignedCandidateReturns.push(ret);
                alignedPortReturns.push(portfolioReturns[i-1]); 
              }
            }
            
            if (alignedCandidateReturns.length < 50) return null;
            
            const corr = correlation(alignedCandidateReturns, alignedPortReturns);
            const annRet = mean(alignedCandidateReturns) * 252;
            const annVol = stdDev(alignedCandidateReturns) * Math.sqrt(252);
            const sharpe = annVol > 0 ? (annRet - riskFreeRate) / annVol : 0;
            
            return {
              ...candidate,
              correlation: corr,
              sharpe: sharpe
            };
          }).filter(Boolean);
          
          const unselected = evaluated.filter((c: any) => !selectedTickers.includes(c.symbol));
          
          const growth = unselected.filter((c: any) => 
            c.drawdown >= -0.05 && 
            c.momentum20D > 0 && 
            c.correlation < 0.3
          ).sort((a: any, b: any) => a.correlation - b.correlation).slice(0, 20);
          
          const dip = unselected.filter((c: any) => 
            c.drawdown <= -0.15 && 
            c.momentum20D > 0 && 
            c.correlation < 0.3
          ).sort((a: any, b: any) => b.momentum20D - a.momentum20D).slice(0, 20);
          
          setRecommendations({ growth, dip });
        }
      } catch (e) {
        console.error("Recommendations error", e);
      } finally {
        setIsRecommendationsLoading(false);
      }
    }
    
    fetchRecommendations();
  }, [quantStats?.portDailyReturns, quantStats?.dates, riskFreeRate, selectedTickers]);


  // Calculate Black-Litterman and Stress test
  useEffect(() => {
    if (!quantStats || Object.keys(viewsData).length === 0 || !historicalData) return;
    
    try {
      const n = quantStats.matrixSymbols.length;
      const w_mkt = Array(n).fill(1/n); 
      
      const benchPrices = historicalData.map((row: any) => row[selectedBenchmark] === null ? null : Number(row[selectedBenchmark])).filter(v => v !== null) as number[];
      const benchReturns = calculateLogReturns(benchPrices);
      const benchVol = Math.sqrt(variance(benchReturns) * 252);
      const benchVar = benchVol * benchVol;
      
      const delta = benchVar > 0 ? (quantStats.benchAnnReturn - riskFreeRate) / benchVar : 2.5; 
      
      const viewsArr = quantStats.matrixSymbols.map((sym: string) => viewsData[sym]?.view || 0);
      const confArr = quantStats.matrixSymbols.map((sym: string) => viewsData[sym]?.conf || 0.5);
      
      const calculateBL = async () => {
        try {
          const { pi, blReturns, blCovariance } = calculateBlackLitterman(
            quantStats.covarianceMatrix,
            w_mkt,
            delta,
            viewsArr,
            confArr
          );
          
          const maxWeightsArr = quantStats.matrixSymbols.map((sym: string) => maxWeights[sym] !== undefined ? maxWeights[sym] : 1.0);
          const minWeightsArr = quantStats.matrixSymbols.map((sym: string) => minWeights[sym] !== undefined ? minWeights[sym] : 0.05);
          const blOpt = await optimizePortfolio(blReturns, blCovariance, riskFreeRate, 100000, undefined, maxWeightsArr, minWeightsArr);
          
          const portDailyVol = blOpt.optimal.volatility / Math.sqrt(252);
          const stress = simulateBlackSwan(portDailyVol, 1000, 3);
          
          setBlStats({
            pi,
            blReturns,
            blCovariance,
            optimization: blOpt,
            stress
          });
        } catch (err) {
          console.log("BL Error", err);
        }
      };
      calculateBL();
    } catch (err) {
      console.log("BL Error", err);
    }
  }, [quantStats, viewsData, riskFreeRate, historicalData, selectedBenchmark, maxWeights, minWeights]);



  const handlePrint = () => {
    window.print();
  };

  const downloadOptimizationCSV = () => {
    if (!quantStats) return;
    
    const headers = ['Asset', 'Weight', 'Expected Return', 'Volatility', 'Sharpe Ratio', 'Beta', 'CAPM E(R)', 'Alpha'];
    const rows = quantStats.assetStats.map((stat: any, i: number) => {
      const weight = quantStats.optimization.optimal.weights[i];
      return [
        stat.symbol,
        (weight * 100).toFixed(2) + '%',
        (stat.annReturn * 100).toFixed(2) + '%',
        (stat.annVolatility * 100).toFixed(2) + '%',
        stat.sharpeRatio.toFixed(2),
        stat.beta.toFixed(3),
        (stat.capmExpectedReturn * 100).toFixed(2) + '%',
        (stat.alpha * 100).toFixed(2) + '%'
      ].join(',');
    });
    
    // Add portfolio total row
    rows.push([]);
    rows.push([
      'PORTFOLIO TOTAL', 
      '100.00%', 
      (quantStats.optimization.optimal.expectedReturn * 100).toFixed(2) + '%', 
      (quantStats.optimization.optimal.volatility * 100).toFixed(2) + '%', 
      quantStats.optimization.optimal.sharpeRatio.toFixed(3), 
      quantStats.portBeta.toFixed(3), 
      (quantStats.portCAPM * 100).toFixed(2) + '%', 
      (quantStats.portAlpha * 100).toFixed(2) + '%'
    ].join(','));
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "portfolio_optimization.csv");
    document.body.appendChild(link); // Required for FF
    link.click();
    document.body.removeChild(link);
  };

  const downloadOptimizationExcel = () => {
    if (!quantStats) return;
    
    const headers = ['Asset', 'Weight', 'Expected Return', 'Volatility', 'Sharpe Ratio', 'Beta', 'CAPM E(R)', 'Alpha'];
    const rows = quantStats.assetStats.map((stat: any, i: number) => {
      const weight = quantStats.optimization.optimal.weights[i];
      return [
        stat.symbol,
        weight,
        stat.annReturn,
        stat.annVolatility,
        stat.sharpeRatio,
        stat.beta,
        stat.capmExpectedReturn,
        stat.alpha
      ];
    });
    
    // Add empty row
    rows.push([]);
    
    // Add portfolio total row
    rows.push([
      'PORTFOLIO TOTAL',
      1.0,
      quantStats.optimization.optimal.expectedReturn,
      quantStats.optimization.optimal.volatility,
      quantStats.optimization.optimal.sharpeRatio,
      quantStats.portBeta,
      quantStats.portCAPM,
      quantStats.portAlpha
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Optimization Data");
    XLSX.writeFile(workbook, "portfolio_optimization.xlsx");
  };

  const downloadStrategyJSON = () => {
    if (!quantStats) return;

    const dataToExport = {
      timestamp: new Date().toISOString(),
      parameters: {
        tickers: selectedTickers,
        benchmark: selectedBenchmark,
        horizonYears,
        riskFreeRate,
        useArimaForecast
      },
      optimizationResults: {
        portfolioMetrics: {
          expectedReturn: quantStats.optimization.optimal.expectedReturn,
          volatility: quantStats.optimization.optimal.volatility,
          sharpeRatio: quantStats.optimization.optimal.sharpeRatio,
          beta: quantStats.portBeta,
          capmExpectedReturn: quantStats.portCAPM,
          alpha: quantStats.portAlpha
        },
        weights: quantStats.assetStats.map((stat: any, i: number) => ({
          symbol: stat.symbol,
          weight: quantStats.optimization.optimal.weights[i]
        })),
        assetMetrics: quantStats.assetStats.map((stat: any, i: number) => ({
          symbol: stat.symbol,
          expectedReturn: stat.annReturn,
          volatility: stat.annVolatility,
          sharpeRatio: stat.sharpeRatio,
          beta: stat.beta,
          capmExpectedReturn: stat.capmExpectedReturn,
          alpha: stat.alpha
        }))
      }
    };

    const jsonStr = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `institutional_strategy_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] flex flex-col font-sans text-[#141414]">
      {/* Main Content Area */}
      <main className="flex-1 p-8 flex flex-col overflow-auto w-full max-w-full">
        {/* App Header */}
        <div className="flex justify-between items-end mb-6 print:hidden">
           <div>
             <h1 className="text-3xl font-bold tracking-tighter">QUANT<span className="text-zinc-400">/</span>CORE</h1>
             <p className="text-xs font-mono uppercase text-zinc-500 mt-1">Institutional Portfolio Optimization Engine</p>
           </div>
           <button 
             onClick={() => setShowMethodology(true)} 
             className="flex items-center gap-2 bg-[#141414] text-[#E4E3E0] px-4 py-2 text-xs font-mono uppercase font-bold hover:bg-zinc-800 transition-colors"
           >
              📖 Methodology & Proof
           </button>
        </div>

        {/* Controls Expander */}
        <div className="mb-6 flex flex-col border border-[#141414] bg-white print:hidden">
          <button 
            onClick={() => setIsParamsExpanded(!isParamsExpanded)}
            className="flex justify-between items-center bg-[#141414] text-[#E4E3E0] p-3 text-xs font-mono uppercase hover:bg-zinc-800 transition-colors"
          >
            <span>⚙️ Parameters & Asset Selection</span>
            <span>{isParamsExpanded ? '[-]' : '[+]'}</span>
          </button>
          
          {isParamsExpanded && (
            <div className="p-6 bg-white flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
                    Select Assets (Up to 7)
                  </label>
                  <div className="flex flex-wrap items-center gap-1 mb-2">
                    {selectedTickers.map(ticker => (
                      <span 
                        key={ticker} 
                        onClick={() => removeTicker(ticker)}
                        className="cursor-pointer px-2 py-0.5 bg-zinc-200 hover:bg-red-100 hover:text-red-700 hover:border-red-300 text-[#141414] border border-zinc-300 rounded-sm text-[9px] font-mono inline-flex items-center transition-colors"
                        title="Click to remove"
                      >
                        {ticker}
                        <span className="ml-1.5 opacity-50">&times;</span>
                      </span>
                    ))}
                    {selectedTickers.length > 0 && (
                      <button 
                        onClick={() => setSelectedTickers([])}
                        className="ml-2 text-[9px] text-zinc-500 hover:text-red-600 uppercase font-bold underline"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2 relative">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={customTicker}
                        onChange={(e) => {
                          setCustomTicker(e.target.value);
                          setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addTicker();
                          }
                        }}
                        placeholder="Add ticker... (e.g. AAPL)"
                        className="w-full bg-zinc-50 text-xs border border-zinc-300 focus:border-[#141414] focus:outline-none p-2 rounded-sm"
                        disabled={selectedTickers.length >= 7}
                      />
                      {showSuggestions && customTicker && filteredTickers.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-300 shadow-lg z-50 rounded-sm overflow-hidden">
                          {filteredTickers.map(t => (
                            <div 
                              key={t.symbol} 
                              className="px-3 py-2 text-xs hover:bg-zinc-100 cursor-pointer flex justify-between items-center"
                              onClick={() => addTicker(t.symbol)}
                            >
                              <span className="font-bold text-[#141414]">{t.symbol}</span>
                              <span className="text-zinc-500 font-serif italic truncate ml-2">{t.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => addTicker()}
                      disabled={selectedTickers.length >= 7}
                      className="px-3 py-2 bg-[#141414] hover:bg-zinc-800 text-[#E4E3E0] rounded-sm text-[10px] uppercase font-bold disabled:opacity-50 shrink-0"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
                    Select Benchmark
                  </label>
                  <select
                    value={selectedBenchmark}
                    onChange={(e) => setSelectedBenchmark(e.target.value)}
                    className="w-full bg-zinc-50 p-2 text-xs border border-zinc-300 font-mono text-[#141414] focus:outline-none focus:border-[#141414] rounded-sm"
                  >
                    {BENCHMARKS.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
                    Time Horizon
                  </label>
                  <div className="flex border border-zinc-300 overflow-hidden rounded-sm">
                    {HORIZON_OPTIONS.map((opt, i) => (
                      <button
                        key={opt.value}
                        onClick={() => setHorizonYears(opt.value)}
                        className={cn(
                          "flex-1 py-2 text-[10px] font-bold uppercase transition-colors",
                          horizonYears === opt.value ? "bg-[#141414] text-[#E4E3E0]" : "bg-zinc-50 hover:bg-zinc-200 text-[#141414]",
                          i > 0 && "border-l border-zinc-300"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
                    Risk-Free Rate (%)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.1"
                      value={riskFreeRate * 100}
                      onChange={(e) => setRiskFreeRate(Number(e.target.value) / 100)}
                      className="flex-1 accent-[#141414]"
                    />
                    <span className="text-xs font-mono w-12 text-right">
                      {(riskFreeRate * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-zinc-200 mt-2">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                  <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Concentration Limits</h4>
                  <div className="flex flex-wrap items-center gap-4 bg-zinc-50 p-2 border border-zinc-200 rounded-sm">
                    <div className="flex items-center gap-2">
                      <label className="text-[9px] font-mono text-zinc-500">Global Min</label>
                      <input 
                        type="number" 
                        min="0" max="100" step="1" 
                        placeholder="5"
                        className="w-16 p-1 text-xs font-mono border border-zinc-300"
                        onBlur={(e) => {
                          if (!e.target.value) return;
                          const val = Number(e.target.value) / 100;
                          const newMinWeights: Record<string, number> = {...minWeights};
                          const newMaxWeights: Record<string, number> = {...maxWeights};
                          selectedTickers.forEach(t => {
                            newMinWeights[t] = val;
                            if ((newMaxWeights[t] !== undefined ? newMaxWeights[t] : 1.0) < val) {
                              newMaxWeights[t] = val;
                            }
                          });
                          setMinWeights(newMinWeights);
                          setMaxWeights(newMaxWeights);
                        }}
                      />
                      <span className="text-[9px] font-mono">%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[9px] font-mono text-zinc-500">Global Max</label>
                      <input 
                        type="number" 
                        min="0" max="100" step="1" 
                        placeholder="20"
                        className="w-16 p-1 text-xs font-mono border border-zinc-300"
                        onBlur={(e) => {
                          if (!e.target.value) return;
                          const val = Number(e.target.value) / 100;
                          const newMinWeights: Record<string, number> = {...minWeights};
                          const newMaxWeights: Record<string, number> = {...maxWeights};
                          selectedTickers.forEach(t => {
                            newMaxWeights[t] = val;
                            if ((newMinWeights[t] !== undefined ? newMinWeights[t] : 0.05) > val) {
                              newMinWeights[t] = val;
                            }
                          });
                          setMinWeights(newMinWeights);
                          setMaxWeights(newMaxWeights);
                        }}
                      />
                      <span className="text-[9px] font-mono">%</span>
                    </div>
                    <button 
                      className="text-[9px] uppercase tracking-wider text-zinc-600 hover:underline px-2 border-l border-zinc-300"
                      onClick={() => {
                        const newMaxWeights: Record<string, number> = {};
                        const newMinWeights: Record<string, number> = {};
                        selectedTickers.forEach(t => {
                          newMaxWeights[t] = 1.0;
                          newMinWeights[t] = 0.05;
                        });
                        setMaxWeights(newMaxWeights);
                        setMinWeights(newMinWeights);
                      }}
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  {selectedTickers.map(ticker => (
                    <div key={ticker} className="flex flex-col gap-2 p-2 bg-zinc-50 border border-zinc-200">
                      <div className="text-[10px] font-bold text-center border-b border-zinc-200 pb-1">{ticker}</div>
                      
                      {/* Min Slider */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-mono text-zinc-500 flex justify-between">
                          <span>Min</span>
                          <span>{(minWeights[ticker] !== undefined ? minWeights[ticker] * 100 : 5).toFixed(0)}%</span>
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={(minWeights[ticker] !== undefined ? minWeights[ticker] * 100 : 5)}
                          onChange={(e) => {
                            const newMin = Number(e.target.value) / 100;
                            const currMax = maxWeights[ticker] !== undefined ? maxWeights[ticker] : 1.0;
                            setMinWeights({...minWeights, [ticker]: newMin});
                            if (newMin > currMax) {
                                setMaxWeights({...maxWeights, [ticker]: newMin});
                            }
                          }}
                          className="w-full accent-blue-600"
                        />
                      </div>

                      {/* Max Slider */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-mono text-zinc-500 flex justify-between">
                          <span>Max</span>
                          <span>{(maxWeights[ticker] !== undefined ? maxWeights[ticker] * 100 : 100).toFixed(0)}%</span>
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={(maxWeights[ticker] !== undefined ? maxWeights[ticker] * 100 : 100)}
                          onChange={(e) => {
                            const newMax = Number(e.target.value) / 100;
                            const currMin = minWeights[ticker] !== undefined ? minWeights[ticker] : 0.05;
                            setMaxWeights({...maxWeights, [ticker]: newMax});
                            if (newMax < currMin) {
                                setMinWeights({...minWeights, [ticker]: newMax});
                            }
                          }}
                          className="w-full accent-purple-600"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-4 border-t border-zinc-200 mt-2 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 p-2 px-4 rounded-sm">
                  <input
                    type="checkbox"
                    id="useArima"
                    checked={useArimaForecast}
                    onChange={(e) => setUseArimaForecast(e.target.checked)}
                    className="accent-[#141414] w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="useArima" className="text-[10px] uppercase tracking-wider text-[#141414] font-bold cursor-pointer">
                    Use ARIMA Forecasts instead of Historical Mean
                  </label>
                </div>
                <button
                  onClick={handleFetchData}
                  disabled={dataLoading || selectedTickers.length === 0}
                  className="w-full sm:w-auto px-8 py-3 flex items-center justify-center gap-2 bg-[#141414] text-[#E4E3E0] font-bold text-xs uppercase tracking-widest hover:bg-zinc-800 transition-colors disabled:opacity-50 mx-auto"
                >
                  {dataLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {dataLoading ? 'Fetching Data...' : 'Update Data & Run Optimization'}
                </button>
              </div>
            </div>
          )}
        {/* TOP TABS */}
        <header className="flex justify-between items-end mb-6 flex-col sm:flex-row gap-6 print:hidden">
          <div className="w-full">
            <h2 className="text-[10px] font-bold font-mono uppercase text-zinc-500 tracking-wider mb-2">Portfolio Environment Workspace</h2>
            <div className="flex w-full bg-zinc-200 p-1 rounded-sm border border-zinc-300">
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={cn("flex-1 py-2 text-xs font-mono uppercase font-bold transition-all rounded-sm", activeTab === 'dashboard' ? "bg-white text-[#141414] shadow-sm" : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100")}
              >
                Dashboard
              </button>
              <button 
                onClick={() => setActiveTab('analytics')}
                className={cn("flex-1 py-2 text-xs font-mono uppercase font-bold transition-all rounded-sm", activeTab === 'analytics' ? "bg-white text-[#141414] shadow-sm" : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100")}
              >
                Advanced Analytics
              </button>
              <button 
                onClick={() => setActiveTab('ai')}
                className={cn("flex-1 py-2 text-xs font-mono uppercase font-bold transition-all rounded-sm", activeTab === 'ai' ? "bg-white text-[#141414] shadow-sm" : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100")}
              >
                AI & Projections
              </button>
              <button 
                onClick={() => setActiveTab('validation')}
                className={cn("flex-1 py-2 text-xs font-mono uppercase font-bold transition-all rounded-sm", activeTab === 'validation' ? "bg-white text-[#141414] shadow-sm" : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100")}
              >
                Data Validation
              </button>
              
            </div>
          </div>
          
          <div className="bg-white border border-[#141414] p-4 min-w-[200px]">
            <div className="text-[10px] uppercase tracking-tighter text-zinc-500 font-bold mb-1">Exchange Rate (USD/CLP)</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono">
                {rateLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-zinc-400 inline" />
                ) : exchangeRate ? (
                  `$${exchangeRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                ) : (
                  '---'
                )}
              </span>
            </div>
            <div className="text-[9px] font-mono text-zinc-400 uppercase">Ticker: CLP=X</div>
          </div>
        </header>

        {error && (
          <div className="bg-white border border-[#141414] text-red-700 px-4 py-3 mb-8 font-mono text-xs">
            ERROR: {error}
          </div>
        )}

        {dataLoading && (
          <div className="flex items-center gap-3 text-[#141414] mb-8 p-4 bg-white border border-[#141414] text-xs font-mono uppercase tracking-widest">
            <Loader2 className="w-4 h-4 animate-spin" />
            {historicalData ? `Running Institutional Optimization Engine & Monte Carlo...` : `Fetching ${horizonYears}-year historical data for ${selectedTickers.length} assets and ${selectedBenchmark}...`}
          </div>
        )}

        {historicalData && !dataLoading && quantStats && (
          <div className="flex-1 overflow-y-auto min-h-[500px] flex flex-col gap-8 pb-12">
            {activeTab === 'dashboard' && (
              <div className="flex flex-col gap-4">
                <div className="flex justify-end print:hidden">
                  <button 
                    onClick={() => setDashboardWidgets(['coreMetrics', 'correlationHeatmap', 'optimalWeights', 'efficientFrontier', 'sectorBreakdown', 'portfolioMetrics', 'factorInvesting'])}
                    className="text-xs font-mono uppercase bg-white border border-zinc-300 text-zinc-600 px-3 py-1 hover:bg-zinc-100 transition-colors flex items-center gap-2"
                  >
                    Reset Grid Layout
                  </button>
                </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={dashboardWidgets} strategy={rectSortingStrategy}>
<div className="grid grid-cols-1 lg:grid-cols-6 gap-8 pb-8">
                    {dashboardWidgets.map(id => {
                      const currentSize = widgetSizes[id] || 3;
                      const spanClass = `col-span-1 ${getColSpanClass(currentSize)} h-full`;
                      const handleSizeChange = (s: number) => setWidgetSizes(prev => ({...prev, [id]: s}));
                      
                      if (id === 'coreMetrics') return (
                        <SortableWidget key={id} id={id} className={spanClass} size={currentSize} onSizeChange={handleSizeChange}>
                          {/* CORE METRICS TABLE */}
                  <div className="flex flex-col h-full bg-white border border-[#141414]">
                    <div className="flex justify-between items-end mb-2">
                      <h3 className="text-xs font-mono uppercase bg-[#141414] text-[#E4E3E0] px-2 py-0.5">Core Risk & Return Metrics</h3>
                      <div className="flex items-center gap-2 print:hidden">
                        <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">Annualized | CAPM Expected</span>
                        <button 
                          onClick={downloadOptimizationCSV}
                          className="flex items-center gap-1 px-2 py-0.5 bg-white border border-[#141414] hover:bg-zinc-100 text-[#141414] text-[10px] uppercase font-bold transition-colors"
                          title="Download CSV"
                        >
                          <Download size={12} />
                          CSV
                        </button>
                        <button 
                          onClick={downloadOptimizationExcel}
                          className="flex items-center gap-1 px-2 py-0.5 bg-white border border-[#141414] hover:bg-zinc-100 text-[#141414] text-[10px] uppercase font-bold transition-colors"
                          title="Download Excel (.xlsx)"
                        >
                          <FileSpreadsheet size={12} />
                          Excel
                        </button>
                        <button 
                          onClick={downloadStrategyJSON}
                          className="flex items-center gap-1 px-2 py-0.5 bg-white border border-[#141414] hover:bg-zinc-100 text-[#141414] text-[10px] uppercase font-bold transition-colors"
                          title="Download Strategy JSON"
                        >
                          <FileJson size={12} />
                          JSON
                        </button>
                        <button 
                          onClick={handlePrint}
                          className="flex items-center gap-1 px-2 py-0.5 bg-white border border-[#141414] hover:bg-zinc-100 text-[#141414] text-[10px] uppercase font-bold transition-colors"
                          title="Print / Export to PDF"
                        >
                          <Printer size={12} />
                          Print
                        </button>
                      </div>
                    </div>
                    <div className="bg-white border border-[#141414] overflow-hidden overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[#141414] bg-[#f9f9f9]">
                            <th className="p-2 text-[10px] font-serif italic border-r border-zinc-200">Asset</th>
                            <th className="p-2 text-[10px] font-serif italic border-r border-zinc-200 text-right">Ann. Return</th>
                            <th className="p-2 text-[10px] font-serif italic border-r border-zinc-200 text-right">Ann. Volatility</th>
                            <th className="p-2 text-[10px] font-serif italic border-r border-zinc-200 text-right">Sharpe</th>
                            <th className="p-2 text-[10px] font-serif italic border-r border-zinc-200 text-right">Beta (β)</th>
                            <th className="p-2 text-[10px] font-serif italic border-r border-zinc-200 text-right">CAPM E(R)</th>
                            <th className="p-2 text-[10px] font-serif italic text-right">Alpha (α)</th>
                          </tr>
                        </thead>
                        <tbody className="font-mono text-[11px]">
                          {quantStats.assetStats.map((stat: any) => (
                            <tr key={stat.symbol} className="border-b border-zinc-100 hover:bg-zinc-50">
                              <td className="p-2 border-r border-zinc-200 font-bold text-[#141414]">{stat.symbol}</td>
                              <td className="p-2 border-r border-zinc-200 text-right cursor-help" title="Calculated from historical daily log returns, annualized (x252)">{(stat.annReturn * 100).toFixed(2)}%</td>
                              <td className="p-2 border-r border-zinc-200 text-right cursor-help" title="Calculated from standard deviation of historical daily log returns, annualized (x√252)">{(stat.annVolatility * 100).toFixed(2)}%</td>
                              <td className="p-2 border-r border-zinc-200 text-right cursor-help" title="Calculated as (Ann. Return - Risk Free Rate) / Ann. Volatility">{stat.sharpeRatio.toFixed(2)}</td>
                              <td className="p-2 border-r border-zinc-200 text-right cursor-help" title="Calculated as Covariance(Asset, Benchmark) / Variance(Benchmark) over the historical period">{stat.beta.toFixed(3)}</td>
                              <td className="p-2 border-r border-zinc-200 text-right cursor-help" title="Calculated using Capital Asset Pricing Model: Risk Free Rate + Beta * (Market Return - Risk Free Rate)">{(stat.capmExpectedReturn * 100).toFixed(2)}%</td>
                              <td className={cn("p-2 text-right font-bold cursor-help", stat.alpha >= 0 ? "text-green-600" : "text-red-600")} title="Jensen's Alpha: Actual Ann. Return - CAPM Expected Return">
                                {(stat.alpha * 100).toFixed(2)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                        </SortableWidget>
                      );
                                            if (id === 'historicalBacktester' && quantStats.optimization && quantStats.benchDailyReturns) {
                        const { portDailyReturns, benchDailyReturns, dates } = quantStats;
                        const data = [];
                        let portCum = 100;
                        let benchCum = 100;
                        
                        // We take the last 12 months (approx 252 trading days) or all available if less
                        const daysToPlot = Math.min(252, portDailyReturns.length);
                        const startIndex = portDailyReturns.length - daysToPlot;
                        
                        data.push({
                            date: dates[startIndex],
                            Portfolio: portCum,
                            Benchmark: benchCum
                        });
                        
                        for (let i = startIndex; i < portDailyReturns.length; i++) {
                            portCum = portCum * Math.exp(portDailyReturns[i]);
                            benchCum = benchCum * Math.exp(benchDailyReturns[i]);
                            data.push({
                                date: dates[i + 1],
                                Portfolio: portCum,
                                Benchmark: benchCum
                            });
                        }
                        
                        const portTotalRet = (portCum - 100);
                        const benchTotalRet = (benchCum - 100);
                        const outperformance = portTotalRet - benchTotalRet;

                        return (
                          <SortableWidget key={id} id={id} className={spanClass} size={currentSize} onSizeChange={handleSizeChange}>
                            <div className="flex flex-col h-full bg-white border border-[#141414]">
                              <div className="flex justify-between items-end mb-2">
                                <h3 className="text-xs font-mono uppercase bg-[#141414] text-[#E4E3E0] px-2 py-0.5">Historical Backtester (12M)</h3>
                                <div className="text-[10px] font-mono px-2 py-0.5 border border-[#141414]">
                                    <span className={outperformance >= 0 ? 'text-green-600' : 'text-red-600'}>
                                        {outperformance >= 0 ? '+' : ''}{outperformance.toFixed(2)}% vs Bench
                                    </span>
                                </div>
                              </div>
                              <div className="flex-1 bg-[#111111] border border-[#141414] p-4 min-h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                                    <XAxis 
                                      allowDuplicatedCategory={false}
                                      dataKey="date" 
                                      tick={{ fontSize: 9, fontFamily: 'monospace', fill: '#888' }} 
                                      stroke="#444" 
                                      minTickGap={30}
                                      tickFormatter={(val) => {
                                          if (!val) return '';
                                          const d = new Date(val);
                                          return `${d.getMonth()+1}/${d.getFullYear().toString().slice(-2)}`;
                                      }}
                                    />
                                    <YAxis 
                                      domain={['auto', 'auto']} 
                                      tick={{ fontSize: 9, fontFamily: 'monospace', fill: '#888' }} 
                                      stroke="#444" 
                                      tickFormatter={(val) => val.toFixed(0)}
                                    />
                                    <Tooltip 
                                      contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#eee', fontSize: '10px', fontFamily: 'monospace' }}
                                      formatter={(value: number, name: string) => [`${(value - 100).toFixed(2)}%`, name]}
                                      labelFormatter={(label) => label}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', color: '#ccc' }} />
                                    <Line type="monotone" dataKey="Portfolio" stroke="#fbbf24" strokeWidth={2} dot={false} isAnimationActive={false} />
                                    <Line type="monotone" dataKey="Benchmark" stroke="#9ca3af" strokeWidth={1} dot={false} isAnimationActive={false} strokeDasharray="5 5" />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          </SortableWidget>
                        );
                      }
                      if (id === 'correlationHeatmap') return (
                        <SortableWidget key={id} id={id} className={spanClass} size={currentSize} onSizeChange={handleSizeChange}>
                          <CorrelationHeatmap matrixSymbols={quantStats.matrixSymbols} correlationMatrix={quantStats.correlationMatrix} isOptimizing={isOptimizing} />
                        </SortableWidget>
                      );
                      if (id === 'optimalWeights' && quantStats.optimization) {
                        const optimalWeightsData = quantStats.matrixSymbols.map((sym: string, i: number) => ({
                          name: sym,
                          value: quantStats.optimization.optimal.weights[i]
                        })).sort((a: any, b: any) => b.value - a.value);
                        
                        const PIE_COLORS = [
                          '#2563eb', '#dc2626', '#16a34a', '#d97706', '#9333ea',
                          '#0891b2', '#be123c', '#4d7c0f', '#ea580c', '#1d4ed8',
                          '#4338ca', '#b91c1c', '#047857', '#b45309', '#7e22ce'
                        ];

                        return (
                        <SortableWidget key={id} id={id} className={spanClass} size={currentSize} onSizeChange={handleSizeChange}>
                          {/* OPTIMAL WEIGHTS PIE CHART */}
                  <div className="flex flex-col h-full bg-white border border-[#141414]">
                    <div className="flex justify-between items-end mb-2">
                      <h3 className="text-xs font-mono uppercase bg-[#141414] text-[#E4E3E0] px-2 py-0.5">Optimal Weights (Max Sharpe)</h3>
                    </div>
                    <div className="flex-1 bg-white border border-[#141414] p-4 flex flex-col md:flex-row items-center justify-between min-h-[300px]">
                      
                      <div className="w-full md:w-1/2 mb-4 md:mb-0">
                        <table className="w-full text-left border-collapse text-xs font-mono">
                          <thead>
                            <tr className="border-b border-[#141414] bg-[#f9f9f9]">
                              <th className="p-2 border-r border-zinc-200">Asset</th>
                              <th className="p-2 text-right">Weight</th>
                            </tr>
                          </thead>
                          <tbody>
                            {optimalWeightsData.map((item: any, index: number) => (
                              <tr key={item.name} className="border-b border-zinc-100 hover:bg-zinc-50">
                                <td className="p-2 border-r border-zinc-200 font-bold flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></div>
                                  {item.name}
                                </td>
                                <td className="p-2 text-right">
                                  {(item.value * 100).toFixed(2)}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="w-full md:w-1/2">
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={optimalWeightsData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={2}
                              dataKey="value"
                              stroke="none"
                            >
                              {optimalWeightsData.map((_: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => `${(value * 100).toFixed(2)}%`} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                    </div>
                  </div>
                        </SortableWidget>
                      );}
                      if (id === 'efficientFrontier' && quantStats.optimization) return (
                        <SortableWidget key={id} id={id} className={spanClass} size={currentSize} onSizeChange={handleSizeChange}>
                          {/* EFFICIENT FRONTIER CHART */}
                  <EfficientFrontier 
                    optimization={quantStats.optimization} 
                    assetStats={quantStats.assetStats} 
                    matrixSymbols={quantStats.matrixSymbols} 
                  />
                        </SortableWidget>
                      );
                      if (id === 'sectorBreakdown' && metadata) return (
                        <SortableWidget key={id} id={id} className={spanClass} size={currentSize} onSizeChange={handleSizeChange}>
                          {/* SECTOR ALLOCATION BREAKDOWN */}
                  <div className="flex flex-col border border-[#141414] bg-white h-full">
                    <button 
                      onClick={() => setIsSectorBreakdownOpen(!isSectorBreakdownOpen)}
                      className="flex justify-between items-center p-3 w-full text-left bg-zinc-50 border-b border-[#141414] hover:bg-zinc-100 transition-colors"
                    >
                      <h3 className="text-xs font-mono uppercase bg-[#141414] text-[#E4E3E0] px-2 py-0.5 inline-block">Sector Allocation Breakdown</h3>
                      {isSectorBreakdownOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    {isSectorBreakdownOpen && (
                      <div className="p-4 min-h-[300px]">
                        <ResponsiveContainer width="100%" height={300}>
                          {(() => {
                            const sectorWeights: Record<string, { weight: number, assets: { symbol: string, weight: number }[] }> = {};
                            quantStats.matrixSymbols.forEach((sym: string, i: number) => {
                              const meta = metadata.find(m => m.symbol === sym);
                              const sector = meta?.sector || "Variado";
                              const weight = quantStats.optimization.optimal.weights[i];
                              
                              if (!sectorWeights[sector]) {
                                sectorWeights[sector] = { weight: 0, assets: [] };
                              }
                              sectorWeights[sector].weight += weight;
                              sectorWeights[sector].assets.push({ symbol: sym, weight });
                            });
                            const sectorData = Object.entries(sectorWeights).map(([sector, data]) => ({
                              sector,
                              weight: data.weight,
                              assets: data.assets.sort((a, b) => b.weight - a.weight)
                            })).sort((a, b) => b.weight - a.weight);
                            
                            const CustomSectorTooltip = ({ active, payload, label }: any) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-white border border-[#141414] p-3 shadow-lg">
                                    <p className="font-bold text-xs uppercase mb-2 border-b border-zinc-200 pb-1">{label} ({(data.weight * 100).toFixed(2)}%)</p>
                                    <ul className="text-xs space-y-1">
                                      {data.assets.map((asset: any) => (
                                        <li key={asset.symbol} className="flex justify-between gap-4">
                                          <span className="font-mono">{asset.symbol}</span>
                                          <span>{(asset.weight * 100).toFixed(2)}%</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                );
                              }
                              return null;
                            };

                            return (
                              <BarChart data={sectorData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e5e5" />
                                <XAxis allowDuplicatedCategory={false} type="number" tickFormatter={(val) => `${(val * 100).toFixed(0)}%`} />
                                <YAxis dataKey="sector" type="category" width={150} tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                                <Tooltip content={<CustomSectorTooltip />} cursor={{ fill: '#f4f4f5' }} />
                                <Bar dataKey="weight" fill="#141414" />
                              </BarChart>
                            );
                          })()}
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                
                        </SortableWidget>
                      );
                      
                      if (id === 'factorInvesting' && metadata && quantStats.optimization) return (
                        <SortableWidget key={id} id={id} className={spanClass} size={currentSize} onSizeChange={handleSizeChange}>
                          <FactorInvestingWidget metadata={metadata} quantStats={quantStats} />
                        </SortableWidget>
                      );
if (id === 'portfolioMetrics' && quantStats.optimization) return (
                        <SortableWidget key={id} id={id} className={spanClass} size={currentSize} onSizeChange={handleSizeChange}>
                          {/* OPTIMIZED PORTFOLIO METRICS */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 h-full">
                  <div className="bg-white border border-[#141414] p-4 flex flex-col justify-center transition-all duration-300 hover:scale-105 hover:shadow-md hover:bg-zinc-50">
                    <div className="text-[10px] uppercase tracking-tighter text-zinc-500 font-bold mb-1">Expected Return (μ)</div>
                    <div className="text-xl font-mono">{(quantStats.optimization.optimal.expectedReturn * 100).toFixed(2)}%</div>
                  </div>
                  <div className="bg-white border border-[#141414] p-4 flex flex-col justify-center transition-all duration-300 hover:scale-105 hover:shadow-md hover:bg-zinc-50">
                    <div className="text-[10px] uppercase tracking-tighter text-zinc-500 font-bold mb-1">Volatility (σ)</div>
                    <div className="text-xl font-mono">{(quantStats.optimization.optimal.volatility * 100).toFixed(2)}%</div>
                  </div>
                  <div className="bg-white border border-[#141414] p-4 flex flex-col justify-center transition-all duration-300 hover:scale-105 hover:shadow-md hover:bg-zinc-50">
                    <div className="text-[10px] uppercase tracking-tighter text-zinc-500 font-bold mb-1">Sharpe Ratio</div>
                    <div className="text-xl font-mono text-green-600">{quantStats.optimization.optimal.sharpeRatio.toFixed(3)}</div>
                  </div>
                  <div className="bg-white border border-[#141414] p-4 flex flex-col justify-center transition-all duration-300 hover:scale-105 hover:shadow-md hover:bg-zinc-50">
                    <div className="text-[10px] uppercase tracking-tighter text-zinc-500 font-bold mb-1">Portfolio Beta (β)</div>
                    <div className="text-xl font-mono">{quantStats.portBeta.toFixed(3)}</div>
                  </div>
                  <div className="bg-white border border-[#141414] p-4 flex flex-col justify-center transition-all duration-300 hover:scale-105 hover:shadow-md hover:bg-zinc-50">
                    <div className="text-[10px] uppercase tracking-tighter text-zinc-500 font-bold mb-1">CAPM Expected Return</div>
                    <div className="text-xl font-mono">{(quantStats.portCAPM * 100).toFixed(2)}%</div>
                  </div>
                  <div className="bg-white border border-[#141414] p-4 flex flex-col justify-center transition-all duration-300 hover:scale-105 hover:shadow-md hover:bg-zinc-50">
                    <div className="text-[10px] uppercase tracking-tighter text-zinc-500 font-bold mb-1">Jensen's Alpha (α)</div>
                    <div className={cn("text-xl font-mono font-bold", quantStats.portAlpha >= 0 ? "text-green-600" : "text-red-600")}>
                      {(quantStats.portAlpha * 100).toFixed(2)}%
                    </div>
                  </div>
                </div>
                        </SortableWidget>
                      );
                      return null;
                    })}
                  </div>
                </SortableContext>
              </DndContext>
              </div>
            )}
                        {/* PROBABILISTIC SCENARIOS */}

            {activeTab === 'analytics' && (
              <>
                {/* PROBABILISTIC SCENARIOS */}
                <div className="flex flex-col mt-8">
                  <div className="flex justify-between items-end mb-2">
                    <h3 className="text-xs font-mono uppercase bg-[#141414] text-[#E4E3E0] px-2 py-0.5">Probabilistic Scenarios (1 Year Horizon)</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {(() => {
                      const mu = quantStats.optimization.optimal.expectedReturn;
                      const sigma = quantStats.optimization.optimal.volatility;
                      return (
                        <>
                          <div className="bg-white border border-red-200 border-l-4 border-l-red-600 p-4">
                            <div className="text-[10px] uppercase tracking-tighter text-zinc-500 font-bold mb-1">Crisis (95% Tail)</div>
                            <div className="text-[9px] font-mono text-zinc-400 mb-2">μ - 1.645 * σ</div>
                            <div className="text-xl font-mono text-red-600">{((mu - 1.645 * sigma) * 100).toFixed(2)}%</div>
                          </div>
                          <div className="bg-white border border-orange-200 border-l-4 border-l-orange-500 p-4">
                            <div className="text-[10px] uppercase tracking-tighter text-zinc-500 font-bold mb-1">Lower Expected</div>
                            <div className="text-[9px] font-mono text-zinc-400 mb-2">μ - 1 * σ</div>
                            <div className="text-xl font-mono text-orange-600">{((mu - 1 * sigma) * 100).toFixed(2)}%</div>
                          </div>
                          <div className="bg-white border border-blue-200 border-l-4 border-l-blue-500 p-4">
                            <div className="text-[10px] uppercase tracking-tighter text-zinc-500 font-bold mb-1">Upper Expected</div>
                            <div className="text-[9px] font-mono text-zinc-400 mb-2">μ + 1 * σ</div>
                            <div className="text-xl font-mono text-blue-600">{((mu + 1 * sigma) * 100).toFixed(2)}%</div>
                          </div>
                          <div className="bg-white border border-green-200 border-l-4 border-l-green-600 p-4">
                            <div className="text-[10px] uppercase tracking-tighter text-zinc-500 font-bold mb-1">Euphoria (95% Tail)</div>
                            <div className="text-[9px] font-mono text-zinc-400 mb-2">μ + 1.645 * σ</div>
                            <div className="text-xl font-mono text-green-600">{((mu + 1.645 * sigma) * 100).toFixed(2)}%</div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* ANALYST TARGETS */}
              </>
            )}

            {activeTab === 'ai' && (
              <>
                {/* ANALYST TARGETS */}
                <div className="flex flex-col mt-8 print:hidden">
                  <button 
                    onClick={() => setIsAnalystTargetsExpanded(!isAnalystTargetsExpanded)}
                    className="flex justify-between items-center bg-[#141414] text-[#E4E3E0] p-3 text-xs font-mono uppercase hover:bg-zinc-800 transition-colors"
                  >
                    <span className="flex items-center gap-2">🎯 Analyst Targets & Expected Growth (Current Portfolio)</span>
                    <span>{isAnalystTargetsExpanded ? '[-]' : '[+]'}</span>
                  </button>
                  {isAnalystTargetsExpanded && (
                    <div className="bg-white border border-[#141414] border-t-0 p-4">
                      {metadataLoading ? (
                        <div className="flex justify-center items-center py-8">
                          <Loader2 className="animate-spin text-zinc-400" size={32} />
                        </div>
                      ) : metadata && metadata.length > 0 ? (
                        <div className="overflow-x-auto border border-zinc-200">
                          <table className="w-full text-left text-xs font-mono">
                            <thead className="bg-zinc-50 border-b border-zinc-200">
                              <tr>
                                <th className="p-2 font-bold">Ticker</th>
                                <th className="p-2 font-bold text-right">Current Price (USD)</th>
                                <th className="p-2 font-bold text-right">1-Year Target Price (USD)</th>
                                <th className="p-2 font-bold text-right">Expected Growth (%)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {metadata.map((c: any, i: number) => {
                                const isValidTarget = c.targetMeanPrice !== null && c.targetMeanPrice !== undefined && !isNaN(c.targetMeanPrice);
                                const isValidCurrent = c.currentPrice !== null && c.currentPrice !== undefined && !isNaN(c.currentPrice);
                                const isGrowthValid = c.expectedGrowth !== null && c.expectedGrowth !== undefined && !isNaN(c.expectedGrowth);
                                
                                return (
                                  <tr key={c.symbol} className={i % 2 === 0 ? "bg-white" : "bg-zinc-50"}>
                                    <td className="p-2 font-bold">{c.symbol}</td>
                                    <td className="p-2 text-right cursor-help" title="Sourced from Yahoo Finance 'price.regularMarketPrice'">{isValidCurrent ? `$${c.currentPrice.toFixed(2)}` : 'N/A'}</td>
                                    <td className="p-2 text-right cursor-help" title="Sourced from Yahoo Finance 'financialData.targetMeanPrice' (average of analyst targets)">{isValidTarget ? `$${c.targetMeanPrice.toFixed(2)}` : 'N/A'}</td>
                                    <td className={`p-2 text-right cursor-help ${isGrowthValid && c.expectedGrowth > 0 ? 'text-green-600' : isGrowthValid && c.expectedGrowth < 0 ? 'text-red-600' : ''}`} title="Calculated as (Target Price - Current Price) / Current Price">
                                      {isGrowthValid ? `${c.expectedGrowth > 0 ? '+' : ''}${c.expectedGrowth.toFixed(2)}%` : 'N/A'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center text-zinc-500 italic text-sm">No analyst target data available.</div>
                      )}
                    </div>
                  )}
                </div>

                                {/* ALPHA EXECUTION */}
                <div className="flex flex-col mt-8 print:hidden">
                  <button 
                    onClick={() => setIsAlphaExecutionExpanded(!isAlphaExecutionExpanded)}
                    className="flex justify-between items-center bg-[#141414] text-[#E4E3E0] p-3 text-xs font-mono uppercase hover:bg-zinc-800 transition-colors"
                  >
                    <span className="flex items-center gap-2">⚡ Alpha Execution: Momentum Crossover Signal</span>
                    <span>{isAlphaExecutionExpanded ? '[-]' : '[+]'}</span>
                  </button>
                  {isAlphaExecutionExpanded && (
                    <div className="bg-white border border-[#141414] border-t-0 p-6 flex flex-col gap-8">
                      {/* Current Signal Status Table */}
                      <div className="flex flex-col">
                        <div className="flex justify-between items-end mb-2">
                          <h3 className="text-xs font-mono uppercase bg-[#141414] text-[#E4E3E0] px-2 py-0.5">Current Signal Status</h3>
                        </div>
                        <div className="overflow-x-auto border border-zinc-200">
                          <table className="w-full text-left text-xs font-mono">
                            <thead className="bg-zinc-50 border-b border-zinc-200">
                              <tr>
                                <th className="p-3 border-r border-zinc-200">Asset</th>
                                <th className="p-3 border-r border-zinc-200">Signal</th>
                                <th className="p-3 text-right">SMA(10) - SMA(30)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.values(alphaSignals).map((signal: any, i: number) => (
                                <tr key={signal.symbol} className={i > 0 ? "border-t border-zinc-200" : ""}>
                                  <td className="p-3 border-r border-zinc-200 font-bold">{signal.symbol}</td>
                                  <td className="p-3 border-r border-zinc-200">
                                    <span className={`px-2 py-1 font-bold ${signal.currentSignal === 'Buy' ? 'bg-green-100 text-green-700' : signal.currentSignal === 'Sell' ? 'bg-red-100 text-red-700' : 'bg-zinc-100 text-zinc-700'}`}>
                                      {signal.currentSignal}
                                    </span>
                                  </td>
                                  <td className="p-3 text-right">
                                    {signal.signalValue > 0 ? '+' : ''}{signal.signalValue.toFixed(4)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Visual Backtest */}
                      <div className="flex flex-col">
                        <div className="flex justify-between items-end mb-2">
                          <h3 className="text-xs font-mono uppercase bg-[#141414] text-[#E4E3E0] px-2 py-0.5">Visual Backtest</h3>
                          <select 
                            value={alphaExecutionSelectedTicker || ''} 
                            onChange={(e) => setAlphaExecutionSelectedTicker(e.target.value)}
                            className="bg-white border border-zinc-300 text-[10px] font-mono px-2 py-1 focus:outline-none focus:border-[#141414]"
                          >
                            {Object.keys(alphaSignals).map(sym => (
                              <option key={sym} value={sym}>{sym}</option>
                            ))}
                          </select>
                        </div>
                        <div className="border border-zinc-200 p-4 bg-zinc-50 h-[400px]">
                          {alphaExecutionSelectedTicker && alphaSignals[alphaExecutionSelectedTicker] ? (() => {
                            const signalData = alphaSignals[alphaExecutionSelectedTicker];
                            const chartData = historicalData!.map((d, i) => {
                              return {
                                date: d.date,
                                price: signalData.historicalPrices[i],
                                sma10: signalData.sma10[i],
                                sma30: signalData.sma30[i],
                                isBuy: signalData.signalSeries[i] !== null && signalData.signalSeries[i]! > 0,
                                isSell: signalData.signalSeries[i] !== null && signalData.signalSeries[i]! < 0
                              };
                            });
                            
                            // Recharts Area for Buy/Sell Zones can be tricky without ReferenceArea intervals.
                            // A simple alternative is using BarChart or customized Area. 
                            // We can use ComposedChart with two separate Area series that use the price max for height.
                            const maxPrice = Math.max(...signalData.historicalPrices) * 1.1;

                            return (
                              <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                                  <XAxis allowDuplicatedCategory={false} dataKey="date" tick={{ fontSize: 10, fontFamily: 'monospace' }} stroke="#71717a" minTickGap={30} />
                                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fontFamily: 'monospace' }} stroke="#71717a" orientation="right" />
                                  <Tooltip 
                                    contentStyle={{ fontFamily: 'monospace', fontSize: '10px', borderRadius: '0', border: '1px solid #141414', padding: '8px' }}
                                    formatter={(value: any, name: string) => [Number(value).toFixed(2), name === 'price' ? 'Price' : name === 'sma10' ? 'SMA(10)' : 'SMA(30)']}
                                    labelStyle={{ color: '#71717a', marginBottom: '4px' }}
                                  />
                                  <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
                                  <Bar dataKey={(d) => d.isBuy ? maxPrice : 0} fill="#dcfce7" name="Buy Zone (SMA10 > SMA30)" isAnimationActive={false} barSize={4} opacity={0.5} />
                                  <Bar dataKey={(d) => d.isSell ? maxPrice : 0} fill="#fee2e2" name="Sell Zone (SMA10 < SMA30)" isAnimationActive={false} barSize={4} opacity={0.5} />
                                  <Line type="monotone" dataKey="price" stroke="#141414" strokeWidth={2} dot={false} name="Price" isAnimationActive={false} />
                                  <Line type="monotone" dataKey="sma10" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="SMA(10)" isAnimationActive={false} />
                                  <Line type="monotone" dataKey="sma30" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="SMA(30)" isAnimationActive={false} />
                                </ComposedChart>
                              </ResponsiveContainer>
                            );
                          })() : (
                            <div className="flex items-center justify-center h-full text-zinc-500 font-mono text-sm">Select an asset</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* AI MARKET SENTIMENT ANALYSIS */}
                <div className="flex flex-col mt-8 print:hidden">
                  <button 
                    onClick={() => setIsSentimentExpanded(!isSentimentExpanded)}
                    className="flex justify-between items-center bg-[#141414] text-[#E4E3E0] p-3 text-xs font-mono uppercase hover:bg-zinc-800 transition-colors"
                  >
                    <span className="flex items-center gap-2">📰 AI Market Sentiment Analysis (NLP)</span>
                    <span>{isSentimentExpanded ? '[-]' : '[+]'}</span>
                  </button>
                  {isSentimentExpanded && (
                    <div className="bg-white border border-[#141414] border-t-0 p-4">
                      {sentimentLoading ? (
                        <div className="flex justify-center items-center py-8">
                          <Loader2 className="animate-spin text-zinc-400" size={32} />
                        </div>
                      ) : sentimentData && sentimentData.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {sentimentData.map((item: any) => {
                            let colorClass = "text-zinc-500";
                            let bgClass = "bg-zinc-100";
                            let borderClass = "border-zinc-300";
                            let label = "Neutral";
                            
                            if (item.score >= 61) {
                              colorClass = "text-green-600";
                              bgClass = "bg-green-100";
                              borderClass = "border-green-300";
                              label = "Bullish / Greed";
                            } else if (item.score <= 39) {
                              colorClass = "text-red-600";
                              bgClass = "bg-red-100";
                              borderClass = "border-red-300";
                              label = "Bearish / Fear";
                            }

                            return (
                              <div key={item.symbol} className={`border ${borderClass} p-4 flex flex-col`}>
                                <div className="flex justify-between items-center mb-4">
                                  <span className="font-bold text-lg font-mono">{item.symbol}</span>
                                  <div className={`px-2 py-1 text-[10px] uppercase font-bold ${bgClass} ${colorClass} border ${borderClass}`}>
                                    {label}
                                  </div>
                                </div>
                                <div className="mb-4">
                                  <div className="flex justify-between text-xs font-mono text-zinc-500 mb-1">
                                    <span>Score</span>
                                    <span>{item.score}/100</span>
                                  </div>
                                  <div className="w-full bg-zinc-200 h-2 rounded-full overflow-hidden flex">
                                    <div 
                                      className={`h-full ${item.score >= 61 ? 'bg-green-500' : item.score <= 39 ? 'bg-red-500' : 'bg-yellow-500'}`} 
                                      style={{ width: `${item.score}%` }}
                                    ></div>
                                  </div>
                                </div>
                                <div className="flex-1 mt-2">
                                  <div className="text-[10px] uppercase tracking-tighter text-zinc-500 font-bold mb-2">Latest Headlines:</div>
                                  {item.news && item.news.length > 0 ? (
                                    <ul className="space-y-3">
                                      {item.news.map((newsItem: any, idx: number) => (
                                        <li key={idx} className="text-xs">
                                          <a href={newsItem.link} target="_blank" rel="noopener noreferrer" className="hover:underline text-[#141414] font-medium block truncate">
                                            {newsItem.title}
                                          </a>
                                          <span className="text-[10px] text-zinc-500">{newsItem.publisher}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <div className="text-xs text-zinc-500 italic">No recent news available.</div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center text-zinc-500 italic text-sm">No sentiment data available.</div>
                      )}
                    </div>
                  )}
                </div>

                
                {/* ARIMA FORECASTING */}
                <div className="flex flex-col mt-8 print:hidden">
                  <button 
                    onClick={() => setIsArimaExpanded(!isArimaExpanded)}
                    className="flex justify-between items-center bg-[#141414] text-[#E4E3E0] p-3 text-xs font-mono uppercase hover:bg-zinc-800 transition-colors"
                  >
                    <span className="flex items-center gap-2">📈 Advanced Time-Series Forecasting (ARIMA)</span>
                    <span>{isArimaExpanded ? '[-]' : '[+]'}</span>
                  </button>
                  {isArimaExpanded && (
                    <div className="bg-white border border-[#141414] border-t-0 p-4">
                      {!useArimaForecast ? (
                        <div className="text-center text-zinc-500 italic text-sm">Please enable ARIMA forecasts in the Optimization Settings to view this module.</div>
                      ) : Object.keys(arimaForecasts).length > 0 ? (
                        <div className="flex flex-col md:flex-row gap-6">
                          <div className="flex-1 overflow-x-auto border border-zinc-200">
                            <table className="w-full text-left text-xs font-mono">
                              <thead className="bg-zinc-50 border-b border-zinc-200">
                                <tr>
                                  <th className="p-2 border-r border-zinc-200">Ticker</th>
                                  <th className="p-2 border-r border-zinc-200 text-center">ADF Stationarity</th>
                                  <th className="p-2 text-right">1-Year Forecast E(R)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.values(arimaForecasts).map((f: any) => (
                                  <tr key={f.symbol} 
                                    className={`border-b border-zinc-100 cursor-pointer transition-colors ${selectedArimaTicker === f.symbol ? 'bg-zinc-100' : 'hover:bg-zinc-50'}`}
                                    onClick={() => setSelectedArimaTicker(f.symbol)}
                                  >
                                    <td className="p-2 border-r border-zinc-200 font-bold">{f.symbol}</td>
                                    <td className="p-2 border-r border-zinc-200 text-center">
                                      {f.isStationary ? <span className="text-green-600">True</span> : <span className="text-red-600">False</span>}
                                    </td>
                                    <td className={`p-2 text-right ${f.expectedReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {(f.expectedReturn * 100).toFixed(2)}%
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          
                          <div className="flex-1 flex flex-col min-h-[300px]">
                            {selectedArimaTicker && arimaForecasts[selectedArimaTicker] ? (() => {
                                const f = arimaForecasts[selectedArimaTicker];
                                const data = f.historicalPrices.map((p, i) => ({ index: i, historicalPrice: p, forecastPrice: null }))
                                  .concat(f.forecastedPrices.map((p, i) => ({ index: f.historicalPrices.length + i, historicalPrice: null, forecastPrice: p })));
                                // Connect the two lines
                                if (data.length > f.historicalPrices.length) {
                                  data[f.historicalPrices.length - 1].forecastPrice = data[f.historicalPrices.length - 1].historicalPrice;
                                }
                                return (
                                  <>
                                    <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-center">{selectedArimaTicker} Forecast Trajectory</h4>
                                    <ResponsiveContainer width="100%" height="100%">
                                      <LineChart data={data}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                                        <XAxis allowDuplicatedCategory={false} dataKey="index" tick={false} axisLine={false} />
                                        <YAxis domain={['auto', 'auto']} tick={{fontSize: 10}} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v.toFixed(0)}`} width={40} />
                                        <Tooltip labelFormatter={() => ''} formatter={(v: number) => `$${v.toFixed(2)}`} />
                                        <Line type="monotone" dataKey="historicalPrice" stroke="#141414" strokeWidth={2} dot={false} isAnimationActive={false} />
                                        <Line type="monotone" dataKey="forecastPrice" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} strokeDasharray="5 5" />
                                      </LineChart>
                                    </ResponsiveContainer>
                                  </>
                                )
                            })() : (
                              <div className="flex items-center justify-center h-full text-zinc-400 italic text-sm">Select a ticker to view trajectory</div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-zinc-500 italic text-sm">Waiting for ARIMA computation...</div>
                      )}
                    </div>
                  )}
                </div>

                {/* AI ASSET RECOMMENDATIONS */}
                <AssetRecommendations
                  recommendations={recommendations}
                  isRecommendationsExpanded={isRecommendationsExpanded}
                  setIsRecommendationsExpanded={setIsRecommendationsExpanded}
                  isRecommendationsLoading={isRecommendationsLoading}
                />

                {/* INVESTMENT CALCULATOR */}
              </>
            )}

            {activeTab === 'dashboard' && (
              <>
                {/* INVESTMENT CALCULATOR */}
                <div className="flex flex-col">
                  <button 
                    onClick={() => setShowInvestmentCalculator(!showInvestmentCalculator)}
                    className="flex justify-between items-center bg-[#141414] text-[#E4E3E0] p-3 text-xs font-mono uppercase hover:bg-zinc-800 transition-colors"
                  >
                    <span>💰 Investment Calculator & Rebalance Trades</span>
                    <span>{showInvestmentCalculator ? '[-]' : '[+]'}</span>
                  </button>
                  
                  {showInvestmentCalculator && (() => {
                    const totalCurrentHoldings = quantStats.matrixSymbols.reduce((sum: number, sym: string) => sum + (currentHoldings[sym] || 0), 0);
                    let targetMultiplier = totalCurrentHoldings + investmentCapital;
                    if (investmentCurrency === 'CLP' && exchangeRate) {
                      // We're displaying everything in the selected currency.
                      // If the user inputs are in the selected currency, we just use them directly.
                      // However, previous code multiplied investmentCapital by exchangeRate if CLP was selected.
                      // Let's just assume investmentCapital and currentHoldings are already in the selected currency.
                    }

                    return (
                    <div className="bg-white border border-[#141414] border-t-0 p-4 flex flex-col gap-4">
                      <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="flex-1">
                          <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">
                            Additional Capital to Invest
                          </label>
                          <input 
                            type="number" 
                            value={investmentCapital}
                            onChange={(e) => setInvestmentCapital(Number(e.target.value))}
                            className="w-full bg-[#f9f9f9] border border-zinc-300 p-2 text-sm font-mono focus:outline-none focus:border-[#141414]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">
                            Currency
                          </label>
                          <div className="flex border border-zinc-300">
                            <button 
                              onClick={() => setInvestmentCurrency('USD')}
                              className={cn("px-4 py-2 text-xs font-bold font-mono transition-colors", investmentCurrency === 'USD' ? "bg-[#141414] text-[#E4E3E0]" : "bg-[#f9f9f9] text-[#141414] hover:bg-zinc-200")}
                            >
                              USD
                            </button>
                            <button 
                              onClick={() => setInvestmentCurrency('CLP')}
                              className={cn("px-4 py-2 text-xs font-bold font-mono transition-colors", investmentCurrency === 'CLP' ? "bg-[#141414] text-[#E4E3E0]" : "bg-[#f9f9f9] text-[#141414] hover:bg-zinc-200")}
                            >
                              CLP
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse mt-2">
                          <thead>
                            <tr className="border-b border-[#141414] bg-[#f9f9f9]">
                              <th className="p-2 text-[10px] font-serif italic border-r border-zinc-200">Ticker</th>
                              <th className="p-2 text-[10px] font-serif italic border-r border-zinc-200 text-right">Optimal Weight (%)</th>
                              <th className="p-2 text-[10px] font-serif italic border-r border-zinc-200 text-right">Current Holding ({investmentCurrency})</th>
                              <th className="p-2 text-[10px] font-serif italic border-r border-zinc-200 text-right">Target Allocation ({investmentCurrency})</th>
                              <th className="p-2 text-[10px] font-serif italic text-right">Rebalance Trade ({investmentCurrency})</th>
                            </tr>
                          </thead>
                          <tbody className="font-mono text-[11px]">
                            {quantStats.matrixSymbols.map((sym: string, i: number) => {
                              const weight = quantStats.optimization.optimal.weights[i];
                              const current = currentHoldings[sym] || 0;
                              const target = weight * targetMultiplier;
                              const trade = target - current;
                              
                              const currentWeightPercentage = targetMultiplier > 0 ? (current / targetMultiplier) * 100 : 0;
                              const targetWeightPercentage = weight * 100;
                              
                              return (
                                <React.Fragment key={sym}>
                                  <tr className="hover:bg-zinc-50">
                                    <td className="p-2 border-r border-zinc-200 font-bold text-[#141414]">{sym}</td>
                                    <td className="p-2 border-r border-zinc-200 text-right">{(weight * 100).toFixed(2)}%</td>
                                    <td className="p-2 border-r border-zinc-200 text-right">
                                      <input 
                                        type="number"
                                        value={current || ''}
                                        placeholder="0"
                                        onChange={(e) => setCurrentHoldings(prev => ({ ...prev, [sym]: Number(e.target.value) }))}
                                        className="w-24 text-right bg-transparent border-b border-zinc-300 focus:outline-none focus:border-[#141414]"
                                      />
                                    </td>
                                    <td className="p-2 border-r border-zinc-200 text-right">
                                      {investmentCurrency === 'USD' ? '$' : '$'}{target.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className={cn("p-2 text-right font-bold", trade > 0 ? "text-green-600" : trade < 0 ? "text-red-600" : "text-zinc-500")}>
                                      {trade > 0 ? 'BUY ' : trade < 0 ? 'SELL ' : ''}
                                      {investmentCurrency === 'USD' ? '$' : '$'}{Math.abs(trade).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                  <tr className="border-b border-zinc-100">
                                    <td colSpan={5} className="px-2 pb-2 pt-0">
                                      <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden flex relative">
                                        <div 
                                          className="h-full bg-[#141414] z-10" 
                                          style={{ width: `${Math.min(100, currentWeightPercentage)}%` }} 
                                          title={`Current: ${currentWeightPercentage.toFixed(2)}%`}
                                        ></div>
                                        <div 
                                          className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-30"
                                          style={{ left: `${Math.min(99.5, targetWeightPercentage)}%` }}
                                          title={`Target: ${targetWeightPercentage.toFixed(2)}%`}
                                        ></div>
                                        {trade > 0 && (
                                          <div 
                                            className="absolute top-0 bottom-0 bg-green-400 z-0 opacity-80"
                                            style={{ left: `${Math.min(100, currentWeightPercentage)}%`, width: `${Math.min(100, targetWeightPercentage - currentWeightPercentage)}%` }}
                                          ></div>
                                        )}
                                        {trade < 0 && (
                                          <div 
                                            className="absolute top-0 bottom-0 bg-red-400 z-20 opacity-80"
                                            style={{ left: `${Math.min(100, targetWeightPercentage)}%`, width: `${Math.min(100, currentWeightPercentage - targetWeightPercentage)}%` }}
                                          ></div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      
                      <div className="flex justify-between items-center mt-4 pt-4 border-t border-zinc-200">
                        <div className="text-[10px] uppercase font-mono text-zinc-500">
                          Total Current: ${totalCurrentHoldings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | 
                          Target Total: ${targetMultiplier.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <button
                          onClick={handleSavePortfolio}
                          disabled={savingPortfolio}
                          className="bg-[#141414] hover:bg-zinc-800 text-[#E4E3E0] px-6 py-3 font-mono text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
                        >
                          {savingPortfolio ? 'Saving...' : 'Save Current Portfolio'}
                        </button>
                      </div>
                    </div>
                    );
                  })()}
                </div>

                {/* SAVED PORTFOLIOS HISTORY */}
                <div className="flex flex-col mt-4">
                  <button 
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex justify-between items-center bg-[#141414] text-[#E4E3E0] p-3 text-xs font-mono uppercase hover:bg-zinc-800 transition-colors"
                  >
                    <span>Saved Portfolios History</span>
                    <span>{showHistory ? '[-]' : '[+]'}</span>
                  </button>
                  
                  {showHistory && (
                    <div className="bg-white border border-[#141414] border-t-0 p-4">
                      {savedPortfolios.length === 0 ? (
                        <div className="text-sm font-mono text-zinc-500 italic">No saved portfolios yet.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-[#141414] bg-[#f9f9f9]">
                                <th className="p-2 text-[10px] font-serif italic border-r border-zinc-200">Date/Time</th>
                                <th className="p-2 text-[10px] font-serif italic border-r border-zinc-200">Tickers</th>
                                <th className="p-2 text-[10px] font-serif italic border-r border-zinc-200 text-right">Risk-Free</th>
                                <th className="p-2 text-[10px] font-serif italic border-r border-zinc-200 text-right">E(R)</th>
                                <th className="p-2 text-[10px] font-serif italic border-r border-zinc-200 text-right">Vol (σ)</th>
                                <th className="p-2 text-[10px] font-serif italic text-right">Sharpe</th>
                              </tr>
                            </thead>
                            <tbody className="font-mono text-[11px]">
                              {savedPortfolios.map((p, i) => (
                                <tr key={i} className="border-b border-zinc-100 hover:bg-zinc-50">
                                  <td className="p-2 border-r border-zinc-200 text-zinc-600 whitespace-nowrap">
                                    {new Date(p.timestamp).toLocaleString()}
                                  </td>
                                  <td className="p-2 border-r border-zinc-200 text-[#141414] font-bold max-w-[200px] truncate">
                                    {p.tickers.join(', ')}
                                  </td>
                                  <td className="p-2 border-r border-zinc-200 text-right">
                                    {(p.riskFreeRate * 100).toFixed(2)}%
                                  </td>
                                  <td className="p-2 border-r border-zinc-200 text-right">
                                    {(p.expectedReturn * 100).toFixed(2)}%
                                  </td>
                                  <td className="p-2 border-r border-zinc-200 text-right">
                                    {(p.volatility * 100).toFixed(2)}%
                                  </td>
                                  <td className="p-2 text-right text-green-600 font-bold">
                                    {p.sharpeRatio.toFixed(3)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'analytics' && blStats && (
              <>
                {/* BLACK LITTERMAN VIEWS UI */}
                <div className="flex flex-col">
                  <div className="flex justify-between items-end mb-2">
                    <h3 className="text-xs font-mono uppercase bg-[#141414] text-[#E4E3E0] px-2 py-0.5">Black-Litterman Views</h3>
                    <span className="text-[10px] text-zinc-500 font-mono">Idzorek Method | Market Implied Priors</span>
                  </div>
                  <div className="bg-white border border-[#141414] overflow-hidden overflow-x-auto p-4">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#141414] bg-[#f9f9f9]">
                          <th className="p-2 text-[10px] font-serif italic border-r border-zinc-200">Asset</th>
                          <th className="p-2 text-[10px] font-serif italic border-r border-zinc-200 text-right">Market Implied Prior (Π)</th>
                          <th className="p-2 text-[10px] font-serif italic border-r border-zinc-200 text-right">User View E(R)</th>
                          <th className="p-2 text-[10px] font-serif italic text-right w-[200px]">Confidence Level</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono text-[11px]">
                        {quantStats.matrixSymbols.map((sym: string, i: number) => {
                          const piValue = blStats.pi[i];
                          const viewVal = viewsData[sym]?.view || 0;
                          const confVal = viewsData[sym]?.conf || 0.5;
                          
                          return (
                            <tr key={`bl-${sym}`} className="border-b border-zinc-100 hover:bg-zinc-50">
                              <td className="p-2 border-r border-zinc-200 font-bold text-[#141414]">{sym}</td>
                              <td className="p-2 border-r border-zinc-200 text-right text-zinc-500">{(piValue * 100).toFixed(2)}%</td>
                              <td className="p-2 border-r border-zinc-200 text-right">
                                <input 
                                  type="number"
                                  step="0.01"
                                  value={(viewVal * 100).toFixed(2)}
                                  onChange={(e) => setViewsData(prev => ({ ...prev, [sym]: { ...prev[sym], view: Number(e.target.value) / 100 } }))}
                                  className="w-20 text-right border border-zinc-300 px-1 py-0.5 focus:outline-none focus:border-[#141414]"
                                />%
                              </td>
                              <td className="p-2 text-right">
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={confVal}
                                    onChange={(e) => setViewsData(prev => ({ ...prev, [sym]: { ...prev[sym], conf: Number(e.target.value) } }))}
                                    className="flex-1 accent-[#141414]"
                                  />
                                  <span className="w-10 text-right text-[9px]">{(confVal * 100).toFixed(0)}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* COMPARISON CHART */}
                <div className="flex flex-col xl:col-span-2">
                  <div className="flex justify-between items-end mb-2">
                    <h3 className="text-xs font-mono uppercase bg-[#141414] text-[#E4E3E0] px-2 py-0.5">Weight Allocation Comparison</h3>
                  </div>
                  <div className="flex-1 bg-white border border-[#141414] p-4 min-h-[300px]">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart 
                        data={quantStats.matrixSymbols.map((sym: string, i: number) => ({
                          name: sym,
                          'Markowitz (Historical)': quantStats.optimization.optimal.weights[i],
                          'Black-Litterman': blStats.optimization.optimal.weights[i]
                        }))}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                        <XAxis allowDuplicatedCategory={false} dataKey="name" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                        <YAxis tickFormatter={(val) => `${(val * 100).toFixed(0)}%`} tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                        <Tooltip formatter={(value: number) => `${(value * 100).toFixed(2)}%`} />
                        <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
                        <Bar dataKey="Markowitz (Historical)" fill="#9ca3af" />
                        <Bar dataKey="Black-Litterman" fill="#141414" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* SYNTHETIC STRESS TEST */}
                <div className="flex flex-col">
                  <div className="flex justify-between items-end mb-2">
                    <h3 className="text-xs font-mono uppercase bg-[#141414] text-[#E4E3E0] px-2 py-0.5">Synthetic Data Stress Testing (Black Swan Simulator)</h3>
                    <span className="text-[10px] text-zinc-500 font-mono">Fat-Tail T-Distribution (df=3) | 1,000 Days</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white border border-red-200 border-l-4 border-l-red-600 p-6 flex flex-col justify-center items-center text-center">
                      <div className="text-[10px] uppercase tracking-tighter text-zinc-500 font-bold mb-2">Maximum Drawdown</div>
                      <div className="text-3xl font-mono text-red-600">{(blStats.stress.maxDrawdown * 100).toFixed(2)}%</div>
                      <div className="text-[9px] mt-2 text-zinc-400 font-mono">Worst-case peak-to-trough drop in synthetic crash</div>
                    </div>
                    <div className="bg-white border border-[#141414] border-l-4 border-l-[#141414] p-6 flex flex-col justify-center items-center text-center">
                      <div className="text-[10px] uppercase tracking-tighter text-zinc-500 font-bold mb-2">Conditional VaR (99%)</div>
                      <div className="text-3xl font-mono">{(blStats.stress.cvar99 * 100).toFixed(2)}%</div>
                      <div className="text-[9px] mt-2 text-zinc-400 font-mono">Average daily loss in the worst 1% of scenarios</div>
                    </div>
                  </div>
                </div>
              </>
            )}

            
            {activeTab === 'analytics' && (
              <div className="flex flex-col gap-8">
                {/* CONFIGURATION */}
                <div className="flex flex-col sm:flex-row gap-6 p-6 bg-white border border-[#141414]">
                  <div className="flex-1">
                    <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2">
                      Initial Investment Amount
                    </label>
                    <input 
                      type="number" 
                      value={mcInitialAmount}
                      onChange={(e) => setMcInitialAmount(Number(e.target.value))}
                      className="w-full bg-[#f9f9f9] border border-zinc-300 p-2 text-sm font-mono focus:outline-none focus:border-[#141414]"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
                        Years to Forecast
                      </label>
                      <span className="text-sm font-mono">{mcYears} Years</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" max="10" step="1"
                      value={mcYears}
                      onChange={(e) => setMcYears(Number(e.target.value))}
                      className="w-full accent-[#141414]"
                    />
                  </div>
                </div>

                {!mcResult ? (
                  <div className="flex justify-center items-center h-[300px]">
                    <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
                  </div>
                ) : (
                  <>
                    {/* SUMMARY CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white border border-[#141414] p-6 flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                        <span className="text-[10px] font-mono uppercase text-zinc-500 mb-2">Bear Market (5th Pct)</span>
                        <span className="text-2xl font-serif text-red-600">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(mcResult.percentiles.p5)}</span>
                      </div>
                      <div className="bg-white border border-[#141414] p-6 flex flex-col items-center text-center bg-blue-50/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                        <span className="text-[10px] font-mono uppercase text-zinc-500 mb-2">Median Expected (50th Pct)</span>
                        <span className="text-3xl font-serif text-[#141414]">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(mcResult.percentiles.p50)}</span>
                      </div>
                      <div className="bg-white border border-[#141414] p-6 flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                        <span className="text-[10px] font-mono uppercase text-zinc-500 mb-2">Bull Market (95th Pct)</span>
                        <span className="text-2xl font-serif text-green-600">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(mcResult.percentiles.p95)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* FAN CHART */}
                      <div className="flex flex-col">
                        <div className="flex justify-between items-end mb-2">
                          <h3 className="text-xs font-mono uppercase bg-[#141414] text-[#E4E3E0] px-2 py-0.5">Cone of Uncertainty</h3>
                          <span className="text-[10px] text-zinc-500 font-mono">Random 100 Paths</span>
                        </div>
                        <div className="flex-1 bg-white border border-[#141414] p-4 min-h-[300px]">
                          <ResponsiveContainer width="100%" height={300}>
                            <ComposedChart>
                              <XAxis allowDuplicatedCategory={false} 
                                type="number"
                                dataKey="step"
                                domain={[0, mcYears * 252]}
                                tickFormatter={(val) => `Y${(val/252).toFixed(1)}`}
                                tick={{ fontSize: 10, fontFamily: 'monospace' }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <YAxis 
                                domain={['auto', 'auto']}
                                tickFormatter={(val) => `${(val/1000).toFixed(0)}k`}
                                tick={{ fontSize: 10, fontFamily: 'monospace' }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <Tooltip 
                                formatter={(val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)}
                                labelFormatter={(label: number) => `Day ${label}`}
                              />
                              {mcResult.paths.map((path, idx) => {
                                // Transform path array into objects for Recharts
                                const data = path.map((val, step) => ({ step, value: val }));
                                return (
                                  <Line 
                                    key={idx}
                                    data={data}
                                    type="monotone"
                                    dataKey="value"
                                    stroke="rgba(37, 99, 235, 0.05)"
                                    strokeWidth={1}
                                    dot={false}
                                    activeDot={false}
                                    isAnimationActive={false}
                                  />
                                );
                              })}
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* HISTOGRAM */}
                      <div className="flex flex-col">
                        <div className="flex justify-between items-end mb-2">
                          <h3 className="text-xs font-mono uppercase bg-[#141414] text-[#E4E3E0] px-2 py-0.5">Final Value Distribution</h3>
                          <span className="text-[10px] text-zinc-500 font-mono">10,000 Simulations</span>
                        </div>
                        <div className="flex-1 bg-white border border-[#141414] p-4 min-h-[300px]">
                          <ResponsiveContainer width="100%" height={300}>
                            {(() => {
                              // Create histogram bins
                              const values = mcResult.finalValues;
                              const min = values[0]; // sorted
                              const max = values[values.length - 1];
                              const numBins = 40;
                              let binWidth = (max - min) / numBins;
                              if (binWidth <= 0) binWidth = 1; // Prevent division by zero
                              
                              const bins = Array.from({length: numBins}, (_, i) => ({
                                name: min + (i + 0.5) * binWidth, // Midpoint
                                count: 0,
                                rangeLabel: `${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(min + i * binWidth)} - ${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(min + (i+1) * binWidth)}`
                              }));
                              
                              for (const val of values) {
                                let binIdx = Math.floor((val - min) / binWidth);
                                if (binIdx < 0) binIdx = 0;
                                if (binIdx >= numBins) binIdx = numBins - 1;
                                bins[binIdx].count++;
                              }
                              
                              return (
                                <BarChart data={bins}>
                                  <XAxis allowDuplicatedCategory={false} 
                                    dataKey="name" 
                                    tickFormatter={(val) => `${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 0 }).format(val)}`}
                                    tick={{ fontSize: 10, fontFamily: 'monospace' }}
                                    axisLine={false}
                                    tickLine={false}
                                  />
                                  <YAxis hide />
                                  <Tooltip 
                                    formatter={(val: number) => [val, 'Count']}
                                    labelFormatter={(_, payload) => payload[0]?.payload.rangeLabel || ''}
                                  />
                                  <Bar dataKey="count" fill="#3b82f6" opacity={0.8} />
                                </BarChart>
                              );
                            })()}
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}



            

            {activeTab === 'validation' && (
              <div className="flex flex-col gap-8">
                <div className="bg-[#f9f9f9] border border-[#141414] border-l-4 border-l-blue-600 p-4 text-[#141414] text-sm font-serif italic">
                  <strong>Note:</strong> Use these tables to verify that the historical prices and daily returns match exactly with the assets traded in your broker account before trusting the optimization output.
                </div>
                
                
                
                {/* TICKER TRANSLATION DICTIONARY */}
                <div className="flex flex-col">
                  <div className="flex justify-between items-end mb-2">
                    <h3 className="text-xs font-mono uppercase bg-[#141414] text-[#E4E3E0] px-2 py-0.5">📘 Ticker Translation Reference (Cross-Platform)</h3>
                  </div>
                  <div className="bg-white border border-[#141414] overflow-hidden overflow-x-auto p-0">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead className="bg-white shadow-sm z-10">
                        <tr className="border-b border-[#141414] bg-[#f9f9f9]">
                          <th className="p-2 text-[10px] font-serif italic border-r border-zinc-200">Asset Name & Description</th>
                          <th className="p-2 text-[10px] font-serif italic border-r border-zinc-200">Racional (Broker) Ticker</th>
                          <th className="p-2 text-[10px] font-serif italic border-r border-zinc-200">Yahoo Finance Ticker</th>
                          <th className="p-2 text-[10px] font-serif italic">Excel (LSEG) Ticker</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono text-[11px]">
                        {selectedTickers.length > 0 ? selectedTickers.map((sym: string, i: number) => {
                          const meta = metadata?.find(m => m.symbol === sym);
                          const assetNameDesc = meta ? meta.nameAndDesc : (metadataLoading ? "Loading..." : "Data not available");
                          const racional = meta ? meta.racionalTicker : sym;
                          const yf = meta ? meta.yahooTicker : sym;
                          const excel = meta ? meta.lsegTicker : sym;

                          return (
                            <tr key={`dict-${sym}-${i}`} className="border-b border-zinc-100 hover:bg-zinc-50">
                              <td className="p-2 border-r border-zinc-200 font-bold whitespace-normal min-w-[200px]">{assetNameDesc}</td>
                              <td className="p-2 border-r border-zinc-200">{racional}</td>
                              <td className="p-2 border-r border-zinc-200">{yf}</td>
                              <td className="p-2">{excel}</td>
                            </tr>
                          );
                        }) : (
                          <tr><td colSpan={4} className="p-4 text-center text-zinc-500 italic">No tickers selected in the portfolio.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {selectedTickers.some((sym: string) => ['BCH', 'BSAC', 'ENIC', 'SQM', 'SQM-B', 'CHILE.SN', 'BSANTANDER.SN', 'ENELCHILE.SN', 'SQM-B.SN'].includes(sym)) && (
                    <div className="mt-4 bg-yellow-50 border border-yellow-200 p-3 text-yellow-800 text-xs font-mono">
                      <strong>Note:</strong> You have selected an asset with cross-market nomenclature. Ensure you are comparing the US-listed ADR prices (Yahoo Finance) with the Racional Stocks USD prices, not the local Chilean peso versions.
                    </div>
                  )}
                </div>

                {/* ASSET DESCRIPTION TABLE */}
                <div className="flex flex-col">
                  <div className="flex justify-between items-end mb-2">
                    <h3 className="text-xs font-mono uppercase bg-[#141414] text-[#E4E3E0] px-2 py-0.5">Asset Descriptions</h3>
                  </div>
                  <div className="bg-white border border-[#141414] overflow-hidden overflow-x-auto p-0">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead className="bg-white shadow-sm z-10">
                        <tr className="border-b border-[#141414] bg-[#f9f9f9]">
                          <th className="p-2 text-[10px] font-serif italic border-r border-zinc-200">Ticker</th>
                          <th className="p-2 text-[10px] font-serif italic border-r border-zinc-200">Name & Description</th>
                          <th className="p-2 text-[10px] font-serif italic border-r border-zinc-200">Sector</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono text-[11px]">
                        {symbols.map((sym: string) => {
                          const meta = metadata?.find((m: any) => m.symbol === sym) || {};
                          return (
                            <tr key={`meta-${sym}`} className="border-b border-zinc-100 hover:bg-zinc-50">
                              <td className="p-2 border-r border-zinc-200 font-bold">{sym}</td>
                              <td className="p-2 border-r border-zinc-200 whitespace-normal min-w-[300px]">
                                {meta.nameAndDesc || 'N/A'}
                              </td>
                              <td className="p-2 border-r border-zinc-200">
                                {meta.sector || 'N/A'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* PRICES TABLE */}
                <div className="flex flex-col">
                  <div className="flex justify-between items-end mb-2">
                    <h3 className="text-xs font-mono uppercase bg-[#141414] text-[#E4E3E0] px-2 py-0.5">Historical Adjusted Closing Prices (USD)</h3>
                  </div>
                  <div className="bg-white border border-[#141414] overflow-hidden overflow-x-auto p-0 max-h-[500px]">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead className="sticky top-0 bg-white shadow-sm z-10">
                        <tr className="border-b border-[#141414] bg-[#f9f9f9]">
                          <th className="p-2 text-[10px] font-serif italic border-r border-zinc-200">Date</th>
                          {symbols.map((sym: string) => (
                            <th key={sym} className="p-2 text-[10px] font-serif italic border-r border-zinc-200 text-right">{sym}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="font-mono text-[11px]">
                        {historicalData.slice().reverse().map((row: any) => (
                          <tr key={`price-${row.date}`} className="border-b border-zinc-100 hover:bg-zinc-50">
                            <td className="p-2 border-r border-zinc-200 text-zinc-500">{row.date}</td>
                            {symbols.map((sym: string) => (
                              <td key={`price-${row.date}-${sym}`} className="p-2 border-r border-zinc-200 text-right text-[#141414]">
                                {row[sym] ? row[sym].toFixed(4) : 'N/A'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* RETURNS TABLE */}
                <div className="flex flex-col">
                  <div className="flex justify-between items-end mb-2">
                    <h3 className="text-xs font-mono uppercase bg-[#141414] text-[#E4E3E0] px-2 py-0.5">Daily Logarithmic Returns</h3>
                  </div>
                  <div className="bg-white border border-[#141414] overflow-hidden overflow-x-auto p-0 max-h-[500px]">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead className="sticky top-0 bg-white shadow-sm z-10">
                        <tr className="border-b border-[#141414] bg-[#f9f9f9]">
                          <th className="p-2 text-[10px] font-serif italic border-r border-zinc-200">Date</th>
                          {symbols.map((sym: string) => (
                            <th key={sym} className="p-2 text-[10px] font-serif italic border-r border-zinc-200 text-right">{sym}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="font-mono text-[11px]">
                        {historicalData.slice(1).reverse().map((row: any, reversedIndex: number) => {
                          const actualIndex = historicalData.length - 1 - reversedIndex;
                          const prevRow = historicalData[actualIndex - 1];
                          return (
                            <tr key={`ret-${row.date}`} className="border-b border-zinc-100 hover:bg-zinc-50">
                              <td className="p-2 border-r border-zinc-200 text-zinc-500">{row.date}</td>
                              {symbols.map((sym: string) => {
                                const currentPrice = row[sym];
                                const prevPrice = prevRow[sym];
                                let retStr = 'N/A';
                                if (currentPrice && prevPrice) {
                                  const ret = Math.log(currentPrice / prevPrice);
                                  retStr = (ret * 100).toFixed(4) + '%';
                                }
                                return (
                                  <td key={`ret-${row.date}-${sym}`} className="p-2 border-r border-zinc-200 text-right text-[#141414]">
                                    {retStr}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            <footer className="mt-auto flex flex-col sm:flex-row justify-between items-start sm:items-center text-[9px] font-mono uppercase text-zinc-500 gap-2">
              <div>Status: Math Engine Operational [Success]</div>
              <div>Rows: {historicalData.length} | Assets: {symbols.length} | Risk-Free: {(riskFreeRate * 100).toFixed(1)}%</div>
            </footer>
          </div>
        )}
        {/* Methodology Modal */}
        {showMethodology && (
          <div className="fixed inset-0 z-50 bg-[#E4E3E0] flex flex-col font-sans overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center bg-[#141414] text-[#E4E3E0] p-4 border-b border-zinc-800 shrink-0">
              <div>
                <h2 className="text-lg font-bold tracking-tighter">METHODOLOGY & MATHEMATICAL PROOF</h2>
                <p className="text-[10px] font-mono uppercase text-zinc-400 mt-1">Academic Whitepaper & Engine Audit</p>
              </div>
              <button 
                onClick={() => setShowMethodology(false)}
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
        )}
        </div>
      </main>
    </div>
  );
}

