const historicalData = [
  { date: '2023-01-01', AAPL: 100, MSFT: 200 },
  { date: '2023-02-01', AAPL: 110, MSFT: 190 },
  { date: '2023-03-01', AAPL: 120, MSFT: 180 },
];
const targetWeights = { AAPL: 0.5, MSFT: 0.5 };
const symbols = ['AAPL', 'MSFT'];
const initialCapital = 10000;
const fixedCommission = 5;
const variableCostPct = 0.1;

const runSim = (strategyType) => {
  let cash = initialCapital;
  let shares = { AAPL: 0, MSFT: 0 };
  let totalCosts = 0;
  let totalTrades = 0;
  let driftData = [];
  
  // Initial allocation
  const initialPrices = historicalData[0];
  for (const sym of symbols) {
    const tradeValue = initialCapital * targetWeights[sym];
    shares[sym] = tradeValue / initialPrices[sym];
    const cost = fixedCommission + tradeValue * (variableCostPct / 100);
    cash -= (tradeValue + cost);
    totalCosts += cost;
    if (tradeValue > 0) totalTrades++;
  }
  
  // Simulate days
  for (let i = 0; i < historicalData.length; i++) {
    const row = historicalData[i];
    
    // current values
    let totalStockValue = 0;
    const currentValues = {};
    for (const sym of symbols) {
      currentValues[sym] = shares[sym] * row[sym];
      totalStockValue += currentValues[sym];
    }
    
    const portValue = totalStockValue + cash;
    
    // track drift
    if (strategyType === 'None') {
      const point = { date: row.date };
      for (const sym of symbols) {
         point[sym] = (currentValues[sym] / totalStockValue) * 100;
      }
      driftData.push(point);
    }
    
    // check rebalancing conditions (skip day 0)
    if (i > 0) {
      let needsRebalance = false;
      if (strategyType === 'Threshold') {
         for (const sym of symbols) {
           const currentWeight = currentValues[sym] / totalStockValue;
           if (Math.abs(currentWeight - targetWeights[sym]) > 0.05) {
             needsRebalance = true;
             break;
           }
         }
      } else if (strategyType === 'Monthly') {
         // simple check if month changed
         const prevDate = new Date(historicalData[i-1].date);
         const currDate = new Date(row.date);
         if (prevDate.getMonth() !== currDate.getMonth()) {
           needsRebalance = true;
         }
      } // add quarterly, annually
      
      if (needsRebalance) {
         // Rebalance
         // target allocation based on CURRENT portValue
         for (const sym of symbols) {
           const targetValue = portValue * targetWeights[sym];
           const diff = targetValue - currentValues[sym];
           
           if (Math.abs(diff) > 1) { // ignore tiny rounding differences
             const tradeShares = diff / row[sym];
             shares[sym] += tradeShares;
             
             const tradeValue = Math.abs(diff);
             const cost = fixedCommission + tradeValue * (variableCostPct / 100);
             
             cash -= (diff + cost); // if buy, diff is pos, cash drops. if sell, diff is neg, cash increases.
             totalCosts += cost;
             totalTrades++;
           }
         }
      }
    }
  }
  
  // final value
  const lastRow = historicalData[historicalData.length - 1];
  let finalStockValue = 0;
  for (const sym of symbols) {
     finalStockValue += shares[sym] * lastRow[sym];
  }
  
  return {
    name: strategyType,
    finalValue: finalStockValue + cash,
    totalCosts,
    totalTrades,
    driftData
  };
}

console.log(runSim('None'));
console.log(runSim('Threshold'));
console.log(runSim('Monthly'));
