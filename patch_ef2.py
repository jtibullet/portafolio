import re

with open('src/App.tsx', 'r') as f:
    text = f.read()

# Import the new component
import_statement = "import { EfficientFrontier } from './components/EfficientFrontier';"
if import_statement not in text:
    text = text.replace("import { FactorInvestingWidget } from './components/FactorInvestingWidget';", "import { FactorInvestingWidget } from './components/FactorInvestingWidget';\n" + import_statement)


old_chart_regex = r'\{\/\*\s*EFFICIENT FRONTIER CHART\s*\*\/\}.*?<\/SortableWidget>'

new_chart_code = """{/* EFFICIENT FRONTIER CHART */}
                  <EfficientFrontier 
                    optimization={quantStats.optimization} 
                    assetStats={quantStats.assetStats} 
                    matrixSymbols={quantStats.matrixSymbols} 
                  />
                        </SortableWidget>"""

text = re.sub(old_chart_regex, new_chart_code, text, flags=re.DOTALL)

with open('src/App.tsx', 'w') as f:
    f.write(text)
