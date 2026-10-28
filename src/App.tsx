import { useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useMarketData } from './hooks/useMarketData';
import { usePortfolioParams } from './hooks/usePortfolioParams';
import { useExchangeRate, useMetadata, useSentiment } from './hooks/useRemoteData';
import {
  usePortfolioAnalysis, useInvestorViews, useBlackLitterman, useMonteCarlo, useRecommendations, useSavedPortfolios,
} from './hooks/usePortfolioAnalysis';
import { UiStateProvider } from './hooks/useUiState';
import { AppHeader } from './components/layout/AppHeader';
import { ParametersPanel } from './components/layout/ParametersPanel';
import { WorkspaceTabs } from './components/layout/WorkspaceTabs';
import { MethodologyModal } from './components/layout/MethodologyModal';
import { DashboardTab } from './components/dashboard/DashboardTab';
import { AnalyticsTab } from './components/analytics/AnalyticsTab';
import { AiTab } from './components/ai/AiTab';
import { ValidationTab } from './components/validation/ValidationTab';
import type { TabId } from './types';

function ErrorBanner({ children }: { children: ReactNode }) {
  return <div className="bg-white border border-[#141414] text-red-700 px-4 py-3 mb-8 font-mono text-xs">{children}</div>;
}

function Workspace() {
  const controls = usePortfolioParams();
  const { params } = controls;
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [showMethodology, setShowMethodology] = useState(false);
  const [mcYears, setMcYears] = useState(5);
  const [mcInitialAmount, setMcInitialAmount] = useState(100000);

  const { data: marketData, isLoading: isFetching, error, fetchData } = useMarketData();
  const { exchangeRate, rateLoading } = useExchangeRate();
  const { metadata, metadataLoading } = useMetadata(params.selectedTickers, params.selectedBenchmark);
  const { sentimentData, sentimentLoading } = useSentiment(params.selectedTickers, activeTab === 'ai');

  const { quantStats, isOptimizing, optimizationError, arimaForecasts, alphaSignals } = usePortfolioAnalysis(marketData, params);
  const [views, setViews] = useInvestorViews(quantStats);
  const blStats = useBlackLitterman(quantStats, views, marketData, params);
  const mcResult = useMonteCarlo(activeTab === 'analytics', quantStats, mcYears, mcInitialAmount);
  const { recommendations, isLoading: recommendationsLoading } = useRecommendations(quantStats, params.riskFreeRate, params.selectedTickers);
  const { savedPortfolios, saving, savePortfolio } = useSavedPortfolios();

  const dataLoading = isFetching || isOptimizing;
  const historicalData = marketData?.historicalData || null;
  const symbols = marketData?.symbols || [];

  return (
    <div className="min-h-screen bg-[#E4E3E0] flex flex-col font-sans text-[#141414]">
      <main className="flex-1 p-8 flex flex-col overflow-auto w-full max-w-full">
        <AppHeader onShowMethodology={() => setShowMethodology(true)} />

        <div className="mb-6 flex flex-col border border-[#141414] bg-white">
          <ParametersPanel
            controls={controls}
            dataLoading={dataLoading}
            onRun={() => fetchData(params.selectedTickers, params.selectedBenchmark, params.horizonYears)}
          />

          <WorkspaceTabs activeTab={activeTab} onChange={setActiveTab} exchangeRate={exchangeRate} rateLoading={rateLoading} />

          {error && <ErrorBanner>ERROR: {error}</ErrorBanner>}
          {optimizationError && <ErrorBanner>OPTIMIZATION ERROR: {optimizationError}</ErrorBanner>}

          {dataLoading && (
            <div className="flex items-center gap-3 text-[#141414] mb-8 p-4 bg-white border border-[#141414] text-xs font-mono uppercase tracking-widest">
              <Loader2 className="w-4 h-4 animate-spin" />
              {historicalData ? `Running Institutional Optimization Engine & Monte Carlo...` : `Fetching ${params.horizonYears}-year historical data for ${params.selectedTickers.length} assets and ${params.selectedBenchmark}...`}
            </div>
          )}

          {/* Previous results stay visible while a parameter change is being re-optimized */}
          {historicalData && quantStats && !isFetching && (
            <div className="flex-1 overflow-y-auto min-h-[500px] flex flex-col gap-8 pb-12">
              {activeTab === 'dashboard' && (
                <DashboardTab
                  quantStats={quantStats}
                  metadata={metadata}
                  params={params}
                  isOptimizing={isOptimizing}
                  savedPortfolios={savedPortfolios}
                  saving={saving}
                  onSave={() => savePortfolio(quantStats, params.riskFreeRate)}
                />
              )}
              {activeTab === 'analytics' && (
                <AnalyticsTab
                  quantStats={quantStats}
                  blStats={blStats}
                  views={views}
                  setViews={setViews}
                  mcResult={mcResult}
                  mcYears={mcYears}
                  setMcYears={setMcYears}
                  mcInitialAmount={mcInitialAmount}
                  setMcInitialAmount={setMcInitialAmount}
                />
              )}
              {activeTab === 'ai' && (
                <AiTab
                  metadata={metadata}
                  metadataLoading={metadataLoading}
                  alphaSignals={alphaSignals}
                  historicalData={historicalData}
                  sentimentData={sentimentData}
                  sentimentLoading={sentimentLoading}
                  useArimaForecast={params.useArimaForecast}
                  arimaForecasts={arimaForecasts}
                  recommendations={recommendations}
                  recommendationsLoading={recommendationsLoading}
                />
              )}
              {activeTab === 'validation' && (
                <ValidationTab
                  selectedTickers={params.selectedTickers}
                  symbols={symbols}
                  metadata={metadata}
                  metadataLoading={metadataLoading}
                  historicalData={historicalData}
                />
              )}

              <footer className="mt-auto flex flex-col sm:flex-row justify-between items-start sm:items-center text-[9px] font-mono uppercase text-zinc-500 gap-2">
                <div>Status: Math Engine Operational [Success]</div>
                <div>Rows: {historicalData.length} | Assets: {symbols.length} | Risk-Free: {(params.riskFreeRate * 100).toFixed(1)}%</div>
              </footer>
            </div>
          )}

          {showMethodology && <MethodologyModal onClose={() => setShowMethodology(false)} />}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <UiStateProvider>
      <Workspace />
    </UiStateProvider>
  );
}
