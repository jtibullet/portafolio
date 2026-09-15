import re

with open('src/App.tsx', 'r') as f:
    text = f.read()

# Replace the duplicate lines
bad_text = """  const { data: marketData, isLoading: isFetching, error, fetchData: fetchMarketData, setError } = useMarketData();
  const [isOptimizing, setIsOptimizing] = useState(false);
  const dataLoading = isFetching || isOptimizing;
  const historicalData = marketData?.historicalData || null;
  const symbols = marketData?.symbols || [];
  
  const [isOptimizing, setIsOptimizing] = useState(false);"""

good_text = """  const { data: marketData, isLoading: isFetching, error, fetchData: fetchMarketData, setError } = useMarketData();
  const [isOptimizing, setIsOptimizing] = useState(false);
  const dataLoading = isFetching || isOptimizing;
  const historicalData = marketData?.historicalData || null;
  const symbols = marketData?.symbols || [];"""

text = text.replace(bad_text, good_text)

with open('src/App.tsx', 'w') as f:
    f.write(text)
