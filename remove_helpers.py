import re

with open('server.ts', 'r') as f:
    text = f.read()

helpers_pattern = r'function polyFit\(x: number\[\], y: number\[\], order: number\): number\[\] \{.*?function blackScholesCall\(S: number, K: number, T: number, r: number, sigma: number\): number \{\n    if \(T <= 0 \|\| sigma <= 0\) return Math\.max\(S - K, 0\);\n    const d1 = \(Math\.log\(S / K\) \+ \(r \+ sigma \* sigma / 2\) \* T\) / \(sigma \* Math\.sqrt\(T\)\);\n    const d2 = d1 - sigma \* Math\.sqrt\(T\);\n    return S \* normCDF\(d1\) - K \* Math\.exp\(-r \* T\) \* normCDF\(d2\);\n\}\n'

text = re.sub(helpers_pattern, '', text, flags=re.DOTALL)

with open('server.ts', 'w') as f:
    f.write(text)
