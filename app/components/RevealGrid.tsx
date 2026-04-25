import Image from "next/image";
import { OwnedCard, RARITY_STYLE, RARITY_BORDER, RARITY_GLOW } from "@/lib/types";

export function RevealGrid({ drawnCards, revealed, kept, onToggle, onKeep, onDiscard }: { drawnCards: OwnedCard[]; revealed: boolean[]; kept: boolean[]; onToggle: (i: number) => void; onKeep: () => void; onDiscard: () => void }) {
  const keptCount = kept.filter(Boolean).length;
  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-400 text-center">Tap cards to keep them</p>
      <div className={`grid gap-3 ${drawnCards.length <= 1 ? "grid-cols-1 max-w-[160px] mx-auto" : drawnCards.length <= 3 ? "grid-cols-3" : "grid-cols-5"}`}>
        {drawnCards.map((c, i) => (
          <button key={c.id} onClick={() => revealed[i] && onToggle(i)} className={`rounded-xl border-2 transition-all duration-300 overflow-hidden ${!revealed[i] ? "bg-zinc-800 border-zinc-700" : kept[i] ? (RARITY_BORDER[c.rarity] ?? "border-zinc-700") + " " + (RARITY_GLOW[c.rarity] ?? "") + " scale-105" : "border-zinc-700 bg-zinc-900 opacity-60"}`} style={{ aspectRatio: "3/4" }}>
            {!revealed[i] ? <div className="w-full h-full flex items-center justify-center text-3xl bg-zinc-800">🃏</div> : (
              <div className="flex flex-col items-center gap-1 p-2 h-full">
                <div className="relative w-full flex-1 rounded-lg overflow-hidden bg-zinc-800"><Image src={c.image} alt={c.name} fill sizes="80px" style={{ objectFit: "cover" }} /></div>
                <p className="text-xs font-semibold text-center leading-tight w-full truncate">{c.name}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${RARITY_STYLE[c.rarity] ?? ""}`}>{c.rarity}</span>
                {kept[i] && <span className="text-xs text-green-400 font-bold">✓</span>}
              </div>
            )}
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={onKeep} disabled={keptCount === 0} className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${keptCount > 0 ? "bg-amber-500 text-black hover:bg-amber-400 active:scale-95" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}>Keep {keptCount > 0 ? `${keptCount} card${keptCount !== 1 ? "s" : ""}` : "selected"}</button>
        <button onClick={onDiscard} className="px-4 py-3 rounded-xl text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-600 transition-all">Discard all</button>
      </div>
    </div>
  );
}