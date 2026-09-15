const YahooFinanceRaw = require('yahoo-finance2');
const yfOptions = { validation: { logErrors: false } };
const yahooFinance = typeof YahooFinanceRaw.default === 'function' ? new YahooFinanceRaw.default(yfOptions) : new YahooFinanceRaw(yfOptions);
yahooFinance.suppressNotices = true;

async function test() {
  try {
    const res = await yahooFinance.quote('^IPSA', {}, { validateResult: false });
    console.log("Success ^IPSA:", res ? res.symbol : "null");
  } catch (e) {
    console.log("Error ^IPSA:", e.message);
  }
}
test();
