import React from 'react';
import { Loader2 } from 'lucide-react';

interface CorrelationHeatmapProps {
  matrixSymbols: string[];
  correlationMatrix: number[][];
  isOptimizing: boolean;
}

export const CorrelationHeatmap: React.FC<CorrelationHeatmapProps> = ({
  matrixSymbols,
  correlationMatrix,
  isOptimizing
}) => {
  const getHeatmapColor = (val: number) => {
    // Helper for linear RGB interpolation
    const interpolateColor = (color1: number[], color2: number[], factor: number) => {
      const r = Math.round(color1[0] + factor * (color2[0] - color1[0]));
      const g = Math.round(color1[1] + factor * (color2[1] - color1[1]));
      const b = Math.round(color1[2] + factor * (color2[2] - color1[2]));
      return `rgb(${r}, ${g}, ${b})`;
    };

    const green = [34, 197, 94];
    const yellow = [253, 224, 71];
    const orange = [249, 115, 22];
    const red = [239, 68, 68];
    
    if (val <= 0.4) {
      // Map -0.1 to 0.4 -> 0 to 1
      const factor = Math.max(0, Math.min(1, (val - (-0.1)) / 0.5));
      return interpolateColor(green, yellow, factor);
    } else {
      // Map 0.4 to 1.0 -> 0 to 1. Starts at orange.
      const factor = Math.min(1, (val - 0.4) / 0.6);
      return interpolateColor(orange, red, factor);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border border-[#141414]">
      <div className="flex justify-between items-end mb-2">
        <h3 className="text-xs font-mono uppercase bg-[#141414] text-[#E4E3E0] px-2 py-0.5">Correlation Heatmap</h3>
      </div>
      <div className="flex-1 bg-white border border-[#141414] overflow-hidden overflow-x-auto relative min-h-[200px]">
        {isOptimizing ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
            <Loader2 className="w-8 h-8 text-[#141414] animate-spin mb-2" />
            <span className="text-xs font-mono font-bold text-[#141414] animate-pulse">Computing Matrix...</span>
          </div>
        ) : null}
        
        <table className="w-full text-left border-collapse h-full">
          <thead>
            <tr className="border-b border-[#141414] bg-[#f9f9f9]">
              <th className="p-2 border-r border-zinc-200"></th>
              {matrixSymbols.map((sym: string) => (
                <th key={sym} className="p-2 text-[10px] font-serif italic border-r border-zinc-200 text-center min-w-[50px]">{sym}</th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono text-[11px]">
            {matrixSymbols.map((rowSym: string, i: number) => (
              <tr key={rowSym} className="border-b border-zinc-100">
                <td className="p-2 border-r border-zinc-200 font-bold bg-[#f9f9f9] text-[10px]">{rowSym}</td>
                {correlationMatrix && correlationMatrix[i] ? correlationMatrix[i].map((val: number, j: number) => (
                  <td key={j} className="p-2 border-r border-zinc-200 text-center text-[#141414] font-bold transition-all duration-300 hover:scale-105 hover:brightness-110 hover:shadow-sm cursor-crosshair" style={{ backgroundColor: getHeatmapColor(val) }}>
                    {val.toFixed(2)}
                  </td>
                )) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
