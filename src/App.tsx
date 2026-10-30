import { lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, BarChart2, Loader2 } from 'lucide-react';
import { useMarketData, type AppError } from './hooks/useMarketData';
import { usePortfolioParams } from './hooks/usePortfolioParams';
import { useExchangeRate, useMetadata, useSentiment } from './hooks/useRemoteData';
import {
  usePortfolioAnalysis, useInvestorViews, useBlackLitterman, useMonteCarlo, useRecommendations, useSavedPortfolios,
} from './hooks/usePortfolioAnalysis';
import { useTheme } from './hooks/useTheme';
import { UiStateProvider } from './hooks/useUiState';
import { I18nProvider, useI18n } from './i18n';
import { warmUpWorker } from './worker/client';
import { AppHeader } from './components/layout/AppHeader';
import { ParametersPanel } from './components/layout/ParametersPanel';
import { WorkspaceTabs } from './components/layout/WorkspaceTabs';

// Tabs and the methodology are loaded on demand so the first page load only needs the shell
const MethodologyModal = lazy(() => import('./components/layout/MethodologyModal').then(m => ({ default: m.MethodologyModal })));
const DashboardTab = lazy(() => import('./components/dashboard/DashboardTab').then(m => ({ default: m.DashboardTab })));
const AnalyticsTab = lazy(() => import('./components/analytics/AnalyticsTab').then(m => ({ default: m.AnalyticsTab })));
const AiTab = lazy(() => import('./components/ai/AiTab').then(m => ({ default: m.AiTab })));
const ValidationTab = lazy(() => import('./components/validation/ValidationTab').then(m => ({ default: m.ValidationTab })));

/** Loads the analysis worker and the dashboard code while the user is still choosing parameters. */
function usePreloadResults() {
  useEffect(() => {
    warmUpWorker();
    import('./components/dashboard/DashboardTab');
  }, []);
}
import type { OptimizationFailure, TabId } from './types';

function Banner({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div role="alert" className="flex gap-3 items-start bg-white border border-red-300 border-l-4 border-l-red-600 text-red-700 px-4 py-3 mb-6 text-xs">
      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
      <div>
        <div className="font-mono font-bold uppercase mb-1">{title}</div>
        <div className="text-ink">{children}</div>
      </div>
    </div>
  );
}

function useOptimizationMessage(failure: OptimizationFailure | null) {
  const { t, f } = useI18n();
  if (!failure) return null;
  switch (failure.code) {
    case 'minSum': return t('opt.minSum', { sum: f.pct(failure.sum ?? 0, 1) });
    case 'maxSum': return t('opt.maxSum', { sum: f.pct(failure.sum ?? 0, 1) });
    case 'minAboveMax': return t('opt.minAboveMax', { symbol: failure.symbol ?? '', min: f.pct(failure.min ?? 0, 1), max: f.pct(failure.max ?? 0, 1) });
    default: return t('opt.generic');
  }
}

function EmptyState() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center text-center gap-3 bg-white border border-dashed border-zinc-300 px-6 py-12 sm:py-16">
      <BarChart2 size={32} className="text-zinc-400" />
      <h3 className="text-sm font-mono uppercase font-bold">{t('empty.title')}</h3>
      <p className="text-sm text-zinc-500 max-w-md">{t('empty.body')}</p>
    </div>
  );
}

/** Placeholder blocks shaped like the dashboard while the first data download runs. */
function ResultsSkeleton() {
  const block = "bg-zinc-200 animate-pulse";
  return (
    <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 sm:gap-8" aria-hidden="true">
      <div className={`${block} h-64 lg:col-span-3`} />
      <div className={`${block} h-64 lg:col-span-3`} />
      <div className={`${block} h-48 lg:col-span-2`} />
      <div className={`${block} h-48 lg:col-span-4`} />
      <div className={`${block} h-20 lg:col-span-6`} />
    </div>
  );
}

function Workspace() {
  usePreloadResults();
  const { t, f, years } = useI18n();
  const theme = useTheme();
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
  const blStats = useBlackLitterman(quantStats, views, marketData, params, metadata);
  const mcResult = useMonteCarlo(activeTab === 'analytics', quantStats, mcYears, mcInitialAmount);
  const { recommendations, isLoading: recommendationsLoading } = useRecommendations(quantStats, params.riskFreeRate, params.selectedTickers);
  const { savedPortfolios, saving, savePortfolio } = useSavedPortfolios();
  const optimizationMessage = useOptimizationMessage(optimizationError);
  const handleSave = useCallback(() => { if (quantStats) savePortfolio(quantStats, params.riskFreeRate); }, [quantStats, savePortfolio, params.riskFreeRate]);

  const dataLoading = isFetching || isOptimizing;
  const historicalData = marketData?.historicalData || null;
  const symbols = marketData?.symbols || [];
  const showResults = !!(historicalData && quantStats && !isFetching);
  const errorText = (e: AppError) => t(e.key, e.vars);

  return (
    <div className="min-h-screen bg-paper flex flex-col font-sans text-ink">
      <main className="flex-1 px-4 py-5 sm:p-8 flex flex-col w-full max-w-[1800px] mx-auto">
        <AppHeader onShowMethodology={() => setShowMethodology(true)} theme={theme.preference} onThemeChange={theme.setPreference} />

        <ParametersPanel
          controls={controls}
          dataLoading={dataLoading}
          onRun={() => fetchData(params.selectedTickers, params.selectedBenchmark, params.horizonYears)}
        />

        <WorkspaceTabs activeTab={activeTab} onChange={setActiveTab} exchangeRate={exchangeRate} rateLoading={rateLoading} />

        {error && <Banner title={t('error.label')}>{errorText(error)}</Banner>}
        {optimizationMessage && <Banner title={t('error.optimizationLabel')}>{optimizationMessage}</Banner>}

        {dataLoading && (
          <div role="status" className="flex items-center gap-3 text-ink mb-6 p-4 bg-white border border-ink text-xs font-mono uppercase tracking-widest">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            {isFetching
              ? t('status.fetching', { years: years(params.horizonYears), count: params.selectedTickers.length, benchmark: params.selectedBenchmark })
              : t('status.optimizing')}
          </div>
        )}

        {isFetching && !quantStats && <ResultsSkeleton />}
        {!historicalData && !isFetching && !error && <EmptyState />}

        {/* Previous results stay visible while a parameter change is being re-optimized */}
        {showResults && (
          <Suspense fallback={<ResultsSkeleton />}>
          <div className="flex-1 min-h-[500px] flex flex-col gap-6 sm:gap-8 pb-12">
            {activeTab === 'dashboard' && (
              <DashboardTab
                quantStats={quantStats!}
                metadata={metadata}
                params={params}
                isOptimizing={isOptimizing}
                savedPortfolios={savedPortfolios}
                saving={saving}
                onSave={handleSave}
              />
            )}
            {activeTab === 'analytics' && (
              <AnalyticsTab
                quantStats={quantStats!}
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
                historicalData={historicalData!}
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
                historicalData={historicalData!}
              />
            )}

            <footer className="mt-auto flex flex-col sm:flex-row justify-between items-start sm:items-center text-[9px] font-mono uppercase text-zinc-500 gap-2">
              <div>{t('footer.status')}</div>
              <div>{t('footer.summary', { rows: f.num(historicalData!.length, 0), assets: symbols.length, rf: f.pct(params.riskFreeRate, 1) })}</div>
            </footer>
          </div>
          </Suspense>
        )}

        {showMethodology && (
          <Suspense fallback={null}>
            <MethodologyModal onClose={() => setShowMethodology(false)} />
          </Suspense>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <UiStateProvider>
        <Workspace />
      </UiStateProvider>
    </I18nProvider>
  );
}
