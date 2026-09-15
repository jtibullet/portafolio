import YahooFinance from 'yahoo-finance2';
const yahooFinance = typeof YahooFinance === 'function' ? new YahooFinance() : new (YahooFinance as any).default();

async function main() {
    try {
        const result = await yahooFinance.chart("IAU", {
            period1: "2023-01-01",
            period2: "2023-01-10",
            interval: "1d"
        });
        console.log(result.quotes.length);
        console.log(result.quotes[0]);
    } catch(e) {
        console.error(e.message);
    }
}
main();
