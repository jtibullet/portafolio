/** Hooks for the server endpoints that are not part of the core analysis. */
import { useEffect, useState } from 'react';
import type { AssetMetadata, SentimentResult } from '../types';

const EXCHANGE_RATE_REFRESH_MS = 10000;

export function useExchangeRate() {
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState(false);

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
    const intervalId = setInterval(fetchExchangeRate, EXCHANGE_RATE_REFRESH_MS);
    return () => clearInterval(intervalId);
  }, []);

  return { exchangeRate, rateLoading };
}

/** Company/fund metadata for the selected tickers and benchmark; refetched only when that set changes. */
export function useMetadata(selectedTickers: string[], selectedBenchmark: string) {
  const [metadata, setMetadata] = useState<AssetMetadata[] | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [lastFetchedKey, setLastFetchedKey] = useState('');

  useEffect(() => {
    const key = [...selectedTickers, selectedBenchmark].sort().join(',');
    if (key === lastFetchedKey || key === '') return;
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
          setLastFetchedKey(key);
        }
      })
      .catch(err => console.error("Failed to fetch metadata:", err))
      .finally(() => setMetadataLoading(false));
  }, [selectedTickers, selectedBenchmark, lastFetchedKey]);

  return { metadata, metadataLoading };
}

/** News sentiment, fetched lazily the first time it is needed for a given ticker set. */
export function useSentiment(selectedTickers: string[], enabled: boolean) {
  const [sentimentData, setSentimentData] = useState<SentimentResult[] | null>(null);
  const [sentimentLoading, setSentimentLoading] = useState(false);
  const [lastFetchedKey, setLastFetchedKey] = useState('');

  useEffect(() => {
    const key = [...selectedTickers].sort().join(',');
    if (key === '' || !enabled || key === lastFetchedKey) return;
    setLastFetchedKey(key);
    setSentimentLoading(true);
    fetch(`/api/sentiment?tickers=${[...new Set(selectedTickers)].join(',')}`)
      .then(res => res.json())
      .then(data => {
        if (data.sentiment) setSentimentData(data.sentiment);
      })
      .catch(err => console.error("Failed to fetch sentiment:", err))
      .finally(() => setSentimentLoading(false));
  }, [selectedTickers, enabled]);

  return { sentimentData, sentimentLoading };
}
