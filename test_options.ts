import YahooFinance from 'yahoo-finance2';
const yahooFinance = typeof YahooFinance === 'function' ? new YahooFinance() : new (YahooFinance as any).default();

async function main() {
  const options = await yahooFinance.options('AAPL');
  console.log(options.options[0].calls.slice(0, 2));
}
main();
