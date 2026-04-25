import { useState } from "react";
import Image from "next/image";
import { OwnedCard, UPGRADE_COST, RARITY_STYLE, RARITY_BORDER, RARITY_GLOW } from "@/lib/types";
import { StarRow } from "./shared";

export function RefineryTab({ collection, onUpgrade }: { collection: OwnedCard[]; onUpgrade: (targetId: string, sacrificeIds: string[]) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected   = collection.find((c) => c.id === selectedId) ?? null;
  const fuelCards  = selected ? collection.filter((c) => c.name === selected.name && c.id !== selectedId) : [];
  const canUpgrade = selected && fuelCards.length >= UPGRADE_COST && selected.stars < 5;
  const groups     = Object.entries(collection.reduce<Record<string, OwnedCard[]>>((acc, c) => { (acc[c.name] = acc[c.name] ?? []).push(c); return acc; }, {}));
  if (!groups.length) return <div className="flex flex-col items-center gap-3 py-20 text-zinc-600"><span style={{ fontSize: 48 }}>⚗️</span><p className="text-sm">No cards to refine — pull some first</p></div>;
  return (
    <div className="w-full space-y-6">
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-1"><p className="text-sm font-semibold">How it works</p><p className="text-xs text-zinc-400">Sacrifice {UPGRADE_COST} duplicates of the same card to gain 1 ★. Max 5 ★.</p></div>
      <div>
        <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wide">Select card to upgrade</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {groups.map(([name, arr]) => {
            const best = arr.reduce((a, b) => (a.stars >= b.stars ? a : b));
            const isSelected = selectedId === best.id;
            const dupeCount  = arr.filter((c) => c.id !== best.id).length;
            return (
              <button key={name} onClick={() => setSelectedId(isSelected ? null : best.id)} className={`rounded-xl border-2 bg-zinc-900 p-2 flex flex-col items-center gap-1.5 transition-all ${isSelected ? (RARITY_BORDER[best.rarity] ?? "border-zinc-700") + " scale-105 " + (RARITY_GLOW[best.rarity] ?? "") : "border-zinc-800 hover:border-zinc-600"}`}>
                <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-zinc-800"><Image src={best.image} alt={best.name} fill sizes="100px" style={{ objectFit: "cover" }} /></div>
                <p className="text-xs font-semibold text-center leading-tight truncate w-full">{name}</p>
                <StarRow count={best.stars} />
                <p className="text-xs text-zinc-500">{dupeCount} dupe{dupeCount !== 1 ? "s" : ""}</p>
              </button>
            );
          })}
        </div>
      </div>
      {selected && (
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div><p className="font-semibold text-sm">{selected.name}</p><div className="flex items-center gap-2 mt-0.5"><StarRow count={selected.stars} />{selected.stars < 5 && <span className="text-zinc-500 text-xs">→ {selected.stars + 1} ★</span>}</div></div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${RARITY_STYLE[selected.rarity] ?? ""}`}>{selected.rarity}</span>
          </div>
          {selected.stars >= 5 ? <p className="text-xs text-amber-400 font-medium">Max stars reached ✦</p> : (
            <>
              <div className="flex justify-between text-xs text-zinc-400"><span>Duplicates available</span><span className={fuelCards.length >= UPGRADE_COST ? "text-green-400" : "text-red-400"}>{fuelCards.length} / {UPGRADE_COST}</span></div>
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${Math.min(100, (fuelCards.length / UPGRADE_COST) * 100)}%` }} /></div>
              <button onClick={() => { if (canUpgrade) { onUpgrade(selected.id, fuelCards.slice(0, UPGRADE_COST).map((c) => c.id)); setSelectedId(null); } }} disabled={!canUpgrade} className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all ${canUpgrade ? "bg-amber-500 text-black hover:bg-amber-400 active:scale-95" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}>{canUpgrade ? `Upgrade to ${selected.stars + 1} ★` : `Need ${UPGRADE_COST - fuelCards.length} more duplicate${UPGRADE_COST - fuelCards.length !== 1 ? "s" : ""}`}</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}