import re

with open('src/App.tsx', 'r') as f:
    text = f.read()

text = text.replace(
    "const { data: marketData, isLoading: dataLoading, error, fetchData: fetchMarketData, setError } = useMarketData();",
    "const { data: marketData, isLoading: isFetching, error, fetchData: fetchMarketData, setError } = useMarketData();\n  const [isOptimizing, setIsOptimizing] = useState(false);\n  const dataLoading = isFetching || isOptimizing;"
)

# wait, I already added isOptimizing in the previous patch. Let's look at the old state vars.
text = text.replace(
    "const { data: marketData, isLoading: dataLoading, error, fetchData: fetchMarketData, setError } = useMarketData();\n  const historicalData = marketData?.historicalData || null;\n  const symbols = marketData?.symbols || [];\n  \n  const [isOptimizing, setIsOptimizing] = useState(false);",
    "const { data: marketData, isLoading: isFetching, error, fetchData: fetchMarketData, setError } = useMarketData();\n  const historicalData = marketData?.historicalData || null;\n  const symbols = marketData?.symbols || [];\n  \n  const [isOptimizing, setIsOptimizing] = useState(false);\n  const dataLoading = isFetching || isOptimizing;"
)

with open('src/App.tsx', 'w') as f:
    f.write(text)
