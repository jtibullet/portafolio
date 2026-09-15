with open('src/App.tsx', 'r') as f:
    text = f.read()

widget_state = "const [dashboardWidgets, setDashboardWidgets] = useState(['coreMetrics', 'correlationHeatmap', 'optimalWeights', 'efficientFrontier', 'sectorBreakdown', 'portfolioMetrics', 'factorInvesting']);"
text = text.replace("const [dashboardWidgets, setDashboardWidgets] = useState(['coreMetrics', 'correlationHeatmap', 'optimalWeights', 'efficientFrontier', 'sectorBreakdown', 'portfolioMetrics']);", widget_state)

with open('src/App.tsx', 'w') as f:
    f.write(text)

