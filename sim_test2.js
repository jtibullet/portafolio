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

const calculateReturns = (values) => {
  const rets = [];
  for (let i = 1; i < values.length; i++) {
     rets.push(Math.log(values[i] / values[i-1]));
  }
  return rets;
}

const stdev = (arr) => {
  if (arr.length <= 1) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

const runSim = (strategyType) => {
  let cash = initialCapital;
  let shares = { AAPL: 0, MSFT: 0 };
  let totalCosts = 0;
  let totalTrades = 0;
  
  const dailyValues = [];
  const idealDailyValues = [];
  let idealValue = initialCapital;
  
  const initialPrices = historicalData[0];
  for (const sym of symbols) {
    const tradeValue = initialCapital * targetWeights[sym];
    shares[sym] = tradeValue / initialPrices[sym];
    const cost = fixedCommission + tradeValue * (variableCostPct / 100);
    cash -= (tradeValue + cost);
    totalCosts += cost;
    if (tradeValue > 0) totalTrades++;
  }
  
  for (let i = 0; i < historicalData.length; i++) {
    const row = historicalData[i];
    
    // ideal
    if (i === 0) {
      idealDailyValues.push(idealValue);
    } else {
      const prevRow = historicalData[i-1];
      let dailyRet = 0;
      for (const sym of symbols) {
        dailyRet += targetWeights[sym] * ((row[sym] - prevRow[sym]) / prevRow[sym]);
      }
      idealValue = idealValue * (1 + dailyRet);
      idealDailyValues.push(idealValue);
    }
    
    let totalStockValue = 0;
    const currentValues = {};
    for (const sym of symbols) {
      currentValues[sym] = shares[sym] * row[sym];
      totalStockValue += currentValues[sym];
    }
    
    const portValue = totalStockValue + cash;
    dailyValues.push(portValue);
    
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
         const prevDate = new Date(historicalData[i-1].date);
         const currDate = new Date(row.date);
         if (prevDate.getMonth() !== currDate.getMonth()) {
           needsRebalance = true;
         }
      } 
      
      if (needsRebalance) {
         for (const sym of symbols) {
           const targetValue = portValue * targetWeights[sym];
           const diff = targetValue - currentValues[sym];
           
           if (Math.abs(diff) > 1) { 
             const tradeShares = diff / row[sym];
             shares[sym] += tradeShares;
             
             const tradeValue = Math.abs(diff);
             const cost = fixedCommission + tradeValue * (variableCostPct / 100);
             
             cash -= (diff + cost); 
             totalCosts += cost;
             totalTrades++;
           }
         }
      }
    }
  }
  
  const strategyRets = calculateReturns(dailyValues);
  const idealRets = calculateReturns(idealDailyValues);
  
  const diffRets = strategyRets.map((r, i) => r - idealRets[i]);
  const trackingError = stdev(diffRets) * Math.sqrt(252);
  
  return {
    name: strategyType,
    finalValue: dailyValues[dailyValues.length - 1],
    totalCosts,
    totalTrades,
    trackingError
  };
}

console.log(runSim('None'));
console.log(runSim('Threshold'));
console.log(runSim('Monthly'));
