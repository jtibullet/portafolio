const yahooFinance = require('yahoo-finance2').default;

async function test() {
    const symbols = ['AAPL', 'MSFT', 'GOOGL'];
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    const period1 = d.toISOString().split('T')[0];
    
    for (const sym of symbols) {
        const res = await yahooFinance.chart(sym, { period1, interval: '1d' });
        console.log(sym, res.quotes.length);
    }
}
test();
