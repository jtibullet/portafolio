import { AnalystTargets } from './AnalystTargets';
import { AlphaExecution } from './AlphaExecution';
import { SentimentPanel } from './SentimentPanel';
import { ArimaPanel } from './ArimaPanel';
import { AssetRecommendations } from './AssetRecommendations';
import type { ARIMA_Forecast, AlphaSignalResult } from '../../utils/quantMath';
import type { AssetMetadata, PriceRow, Recommendations, SentimentResult } from '../../types';

export function AiTab(props: {
  metadata: AssetMetadata[] | null;
  metadataLoading: boolean;
  alphaSignals: Record<string, AlphaSignalResult>;
  historicalData: PriceRow[];
  sentimentData: SentimentResult[] | null;
  sentimentLoading: boolean;
  useArimaForecast: boolean;
  arimaForecasts: Record<string, ARIMA_Forecast>;
  recommendations: Recommendations | null;
  recommendationsLoading: boolean;
}) {
  return (
    <>
      <AnalystTargets metadata={props.metadata} loading={props.metadataLoading} />
      <AlphaExecution alphaSignals={props.alphaSignals} historicalData={props.historicalData} />
      <SentimentPanel sentimentData={props.sentimentData} loading={props.sentimentLoading} />
      <ArimaPanel enabled={props.useArimaForecast} forecasts={props.arimaForecasts} />
      <AssetRecommendations recommendations={props.recommendations} loading={props.recommendationsLoading} />
    </>
  );
}
