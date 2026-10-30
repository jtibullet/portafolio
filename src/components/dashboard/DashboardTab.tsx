import React from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { usePersistentState } from '../../hooks/usePersistentState';
import { useI18n } from '../../i18n';
import { DEFAULT_DASHBOARD_WIDGETS, DEFAULT_WIDGET_SIZES } from '../../constants';
import { SortableWidget } from './SortableWidget';
import { CoreMetricsWidget } from './CoreMetricsWidget';
import { PerformanceWidget } from './PerformanceWidget';
import { CorrelationHeatmap } from './CorrelationHeatmap';
import { OptimalWeightsWidget } from './OptimalWeightsWidget';
import { EfficientFrontier } from './EfficientFrontier';
import { SectorBreakdownWidget } from './SectorBreakdownWidget';
import { FactorInvestingWidget } from './FactorInvestingWidget';
import { PortfolioMetricsWidget } from './PortfolioMetricsWidget';
import { InvestmentCalculator } from './InvestmentCalculator';
import { ObjectiveComparisonWidget } from './ObjectiveComparisonWidget';
import { SavedPortfoliosHistory } from './SavedPortfoliosHistory';
import type { AssetMetadata, PortfolioParams, QuantStats, SavedPortfolio } from '../../types';

const COL_SPAN: Record<number, string> = { 2: "lg:col-span-2", 3: "lg:col-span-3", 4: "lg:col-span-4", 6: "lg:col-span-6" };

interface DashboardTabProps {
  quantStats: QuantStats;
  metadata: AssetMetadata[] | null;
  params: PortfolioParams;
  isOptimizing: boolean;
  savedPortfolios: SavedPortfolio[];
  saving: boolean;
  onSave: () => void;
}

/** Content of one widget, or null when the data it needs is not available. */
function renderWidget(id: string, { quantStats, metadata, params, isOptimizing }: DashboardTabProps): React.ReactNode {
  const hasOptimization = !!quantStats.optimization;
  switch (id) {
    case 'coreMetrics':
      return <CoreMetricsWidget quantStats={quantStats} params={params} />;
    case 'historicalBacktester':
      return hasOptimization && quantStats.benchDailyReturns ? <PerformanceWidget quantStats={quantStats} /> : null;
    case 'correlationHeatmap':
      return <CorrelationHeatmap matrixSymbols={quantStats.matrixSymbols} correlationMatrix={quantStats.correlationMatrix} isOptimizing={isOptimizing} />;
    case 'optimalWeights':
      return hasOptimization ? <OptimalWeightsWidget quantStats={quantStats} /> : null;
    case 'efficientFrontier':
      return hasOptimization ? <EfficientFrontier optimization={quantStats.optimization!} assetStats={quantStats.assetStats} matrixSymbols={quantStats.matrixSymbols} /> : null;
    case 'sectorBreakdown':
      return hasOptimization && metadata ? <SectorBreakdownWidget quantStats={quantStats} metadata={metadata} /> : null;
    case 'factorInvesting':
      return hasOptimization && metadata ? <FactorInvestingWidget metadata={metadata} quantStats={quantStats} /> : null;
    case 'objectiveComparison':
      return hasOptimization && Object.keys(quantStats.alternatives).length > 1 ? <ObjectiveComparisonWidget quantStats={quantStats} /> : null;
    case 'portfolioMetrics':
      return hasOptimization ? <PortfolioMetricsWidget quantStats={quantStats} /> : null;
    default:
      return null;
  }
}

/** Memoized: results arriving for other tabs (Black-Litterman, recommendations) must not redraw every chart here. */
export const DashboardTab = React.memo(function DashboardTab(props: DashboardTabProps) {
  const { t } = useI18n();
  const [savedWidgets, setWidgets] = usePersistentState<string[]>('dashboardWidgets', DEFAULT_DASHBOARD_WIDGETS);
  // A layout saved before a widget existed doesn't list it; show new widgets at the end
  const widgets = [...savedWidgets, ...DEFAULT_DASHBOARD_WIDGETS.filter(id => !savedWidgets.includes(id))];
  const [sizes, setSizes] = usePersistentState<Record<string, number>>('widgetSizes', DEFAULT_WIDGET_SIZES);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setWidgets(arrayMove(widgets, widgets.indexOf(active.id as string), widgets.indexOf(over.id as string)));
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="hidden lg:flex justify-end print:hidden">
          <button
            onClick={() => setWidgets(DEFAULT_DASHBOARD_WIDGETS)}
            className="text-xs font-mono uppercase bg-white border border-zinc-300 text-zinc-600 px-3 py-1 hover:bg-zinc-100 transition-colors flex items-center gap-2"
          >
            {t('dash.resetLayout')}
          </button>
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={widgets} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 sm:gap-8 pb-4 sm:pb-8">
              {widgets.map(id => {
                const content = renderWidget(id, props);
                if (!content) return null;
                const size = sizes[id] || 3;
                return (
                  <SortableWidget
                    key={id}
                    id={id}
                    className={`col-span-1 ${COL_SPAN[size] || COL_SPAN[3]} h-full`}
                    size={size}
                    onSizeChange={s => setSizes(prev => ({ ...prev, [id]: s }))}
                  >
                    {content}
                  </SortableWidget>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {props.quantStats.optimization && <InvestmentCalculator quantStats={props.quantStats} saving={props.saving} onSave={props.onSave} />}
      <SavedPortfoliosHistory savedPortfolios={props.savedPortfolios} />
    </>
  );
});
