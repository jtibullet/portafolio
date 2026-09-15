const fs = require('fs');
let code = fs.readFileSync('src/monteCarlo.ts', 'utf8');

code = code.replace(/export function randomNormal\(\): number \{[\s\S]*?\}/, 
`import { seededRandomNormal, setSeed } from './utils/quantMath';

export function randomNormal(): number {
  return seededRandomNormal();
}`);

code = code.replace(/export async function runMonteCarlo\([\s\S]*?\{/, (match) => {
  return match + `\n  // Deterministic seed for repeatable Monte Carlo paths\n  setSeed(42);\n`;
});

fs.writeFileSync('src/monteCarlo.ts', code);
