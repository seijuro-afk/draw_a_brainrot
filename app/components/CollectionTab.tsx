import { useState } from "react";
import Image from "next/image";
import { OwnedCard, SortMode, RARITY_ORDER, RARITY_STYLE, RARITY_BORDER, RARITY_GLOW } from "@/lib/types";
import { InspectModal } from "./InspectModal";
import { StarRow } from "./shared";
import { cardPowerScore } from "@/lib/utils";

export function CollectionTab({ collection, onFavorite, onDelete }: {
  collection: OwnedCard[];
  onFavorite: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [sortMode, setSortMode]       = useState<SortMode>("rarity");
  const [filterFav, setFilterFav]     = useState(false);
  const [inspecting, setInspecting]   = useState<OwnedCard | null>(null);

  if (!collection.length) return (
    <div className="flex flex-col items-center gap-3 py-20 text-zinc-600">
      <span style={{ fontSize: 48 }}>📖</span>
      <p className="text-sm">No cards yet — pull some!</p>
    </div>
  );

  // Deduplicate by name, keeping highest-starred version
  const unique = Object.values(
    collection.reduce<Record<string, OwnedCard>>((acc, c) => {
      if (!acc[c.name] || c.stars > acc[c.name].stars) acc[c.name] = c;
      return acc;
    }, {})
  );

  const filtered = filterFav ? unique.filter((c) => c.favorited) : unique;

  const sorted = [...filtered].sort((a, b) => {
    if (sortMode === "rarity") return (RARITY_ORDER[b.rarity] ?? 0) - (RARITY_ORDER[a.rarity] ?? 0);
    if (sortMode === "power")  return cardPowerScore(b) - cardPowerScore(a);
    return b.obtainedAt - a.obtainedAt;
  });

  return (
    <>
      {/* Inspect modal — rendered outside the scroll container */}
      {inspecting && (
        <InspectModal
          card={inspecting}
          onClose={() => setInspecting(null)}
          onFavorite={() => {
            onFavorite(inspecting.id);
            setInspecting((prev) => prev ? { ...prev, favorited: !prev.favorited } : null);
          }}
          onDelete={() => {
            onDelete(inspecting.id);
            setInspecting(null);
          }}
        />
      )}

      <div className="flex flex-col h-full" style={{ height: "calc(100vh - 200px)" }}>
        {/* Controls row */}
        <div className="shrink-0 space-y-2 mb-3">
          <div className="flex items-center gap-2">
            <p className="text-sm text-zinc-500 flex-1">
              {sorted.length} card{sorted.length !== 1 ? "s" : ""}
              {filterFav ? " ⭐" : ` / ${unique.length} unique`}
            </p>
            {/* Fav filter */}
            <button onClick={() => setFilterFav((f) => !f)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all
                ${filterFav ? "bg-yellow-900/40 border-yellow-700 text-yellow-300" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"}`}>
              ⭐ Favs
            </button>
            {/* Sort */}
            <div className="flex rounded-lg overflow-hidden border border-zinc-800 text-xs">
              {(["rarity", "power", "date"] as SortMode[]).map((m) => (
                <button key={m} onClick={() => setSortMode(m)}
                  className={`px-2.5 py-1.5 font-medium transition-all
                    ${sortMode === m ? "bg-zinc-700 text-white" : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"}`}>
                  {m === "rarity" ? "💎" : m === "power" ? "⚡" : "🕐"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Card grid — scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0 pr-1">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-zinc-600">
              <span style={{ fontSize: 36 }}>⭐</span>
              <p className="text-sm">No favorited cards yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-4">
              {sorted.map((c) => (
                <button
                  key={c.name}
                  onClick={() => setInspecting(c)}
                  className={`rounded-xl border-2 bg-zinc-900 p-2 flex flex-col items-center gap-1.5 text-left transition-all hover:scale-[1.02] active:scale-[0.98]
                    ${RARITY_BORDER[c.rarity] ?? "border-zinc-700"} ${RARITY_GLOW[c.rarity] ?? ""}`}>
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-zinc-800">
                    <Image src={c.image} alt={c.name} fill sizes="100px" style={{ objectFit: "cover" }} />
                    {c.favorited && (
                      <span className="absolute top-1 right-1 text-sm leading-none">⭐</span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-center leading-tight w-full truncate">{c.name}</p>
                  <StarRow count={c.stars} />
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${RARITY_STYLE[c.rarity] ?? "bg-zinc-700 text-zinc-300"}`}>{c.rarity}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}