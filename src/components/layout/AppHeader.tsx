export function AppHeader({ onShowMethodology }: { onShowMethodology: () => void }) {
  return (
    <div className="flex justify-between items-end mb-6 print:hidden">
      <div>
        <h1 className="text-3xl font-bold tracking-tighter">QUANT<span className="text-zinc-400">/</span>CORE</h1>
        <p className="text-xs font-mono uppercase text-zinc-500 mt-1">Institutional Portfolio Optimization Engine</p>
      </div>
      <button
        onClick={onShowMethodology}
        className="flex items-center gap-2 bg-[#141414] text-[#E4E3E0] px-4 py-2 text-xs font-mono uppercase font-bold hover:bg-zinc-800 transition-colors"
      >
        📖 Methodology & Proof
      </button>
    </div>
  );
}
