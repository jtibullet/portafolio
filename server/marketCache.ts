import type Database from "better-sqlite3";

export interface PricePoint {
  date: string;
  adjClose: number;
}

/** Daily prices are reused for this long before Yahoo Finance is asked again. */
export const PRICE_TTL_MS = 4 * 60 * 60 * 1000;

/**
 * Cache of daily adjusted closes per symbol. A cached series is used when it is fresh and starts
 * on or before the requested start date. Stored in SQLite (so it survives restarts) when the
 * database is available, otherwise in memory.
 */
export function createPriceCache(db: Database.Database | null, now: () => number = Date.now) {
  const memory = new Map<string, { startDate: string; fetchedAt: number; rows: PricePoint[] }>();

  if (db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS price_history (
        symbol TEXT NOT NULL,
        date TEXT NOT NULL,
        adj_close REAL NOT NULL,
        PRIMARY KEY (symbol, date)
      );
      CREATE TABLE IF NOT EXISTS price_fetches (
        symbol TEXT PRIMARY KEY,
        start_date TEXT NOT NULL,
        fetched_at INTEGER NOT NULL
      );
    `);
  }

  const readFetch = db?.prepare("SELECT start_date AS startDate, fetched_at AS fetchedAt FROM price_fetches WHERE symbol = ?");
  const readRows = db?.prepare("SELECT date, adj_close AS adjClose FROM price_history WHERE symbol = ? AND date >= ? ORDER BY date");
  const deleteRows = db?.prepare("DELETE FROM price_history WHERE symbol = ?");
  const insertRow = db?.prepare("INSERT OR REPLACE INTO price_history (symbol, date, adj_close) VALUES (?, ?, ?)");
  const upsertFetch = db?.prepare("INSERT OR REPLACE INTO price_fetches (symbol, start_date, fetched_at) VALUES (?, ?, ?)");
  const replaceSeries = db?.transaction((symbol: string, startDate: string, rows: PricePoint[], fetchedAt: number) => {
    deleteRows!.run(symbol);
    for (const row of rows) insertRow!.run(symbol, row.date, row.adjClose);
    upsertFetch!.run(symbol, startDate, fetchedAt);
  });

  const isUsable = (entry: { startDate: string; fetchedAt: number } | undefined, startDate: string) =>
    !!entry && now() - entry.fetchedAt < PRICE_TTL_MS && entry.startDate <= startDate;

  return {
    get(symbol: string, startDate: string): PricePoint[] | null {
      if (db) {
        const entry = readFetch!.get(symbol) as { startDate: string; fetchedAt: number } | undefined;
        return isUsable(entry, startDate) ? (readRows!.all(symbol, startDate) as PricePoint[]) : null;
      }
      const entry = memory.get(symbol);
      return isUsable(entry, startDate) ? entry!.rows.filter(r => r.date >= startDate) : null;
    },

    set(symbol: string, startDate: string, rows: PricePoint[]) {
      if (db) replaceSeries!(symbol, startDate, rows, now());
      else memory.set(symbol, { startDate, fetchedAt: now(), rows });
    },
  };
}

/** Small time-based cache for single values (exchange rate, metadata per symbol). */
export function createTtlCache<T>(ttlMs: number, now: () => number = Date.now) {
  const entries = new Map<string, { value: T; at: number }>();
  return {
    get(key: string): T | undefined {
      const entry = entries.get(key);
      return entry && now() - entry.at < ttlMs ? entry.value : undefined;
    },
    set(key: string, value: T) {
      entries.set(key, { value, at: now() });
    },
  };
}

/** Like Promise.all over items.map(fn), but with at most `limit` calls in flight. */
export async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}
