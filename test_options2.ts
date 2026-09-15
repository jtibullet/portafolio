import YahooFinance from 'yahoo-finance2';
const yahooFinance = typeof YahooFinance === 'function' ? new YahooFinance() : new (YahooFinance as any).default();

async function main() {
  const options = await yahooFinance.options('AAPL');
  console.log(Object.keys(options));
  console.log(options.expirationDates);
  console.log(options.quote.regularMarketPrice);
}
main();
