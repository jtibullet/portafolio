import re
with open('src/App.tsx', 'r') as f:
    text = f.read()

text = text.replace("          </div>\n        {/* Methodology Modal */}", "          </div>\n        )}\n\n        {/* Methodology Modal */}")

with open('src/App.tsx', 'w') as f:
    f.write(text)
