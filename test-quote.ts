import yahooFinance from 'yahoo-finance2';
async function run() {
  const q = await yahooFinance.quote("CLP=X");
  console.log(q);
}
run();
