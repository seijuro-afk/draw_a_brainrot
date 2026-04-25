import { useState } from "react";
import Image from "next/image";
import { OwnedCard, RARITY_STYLE, RARITY_BORDER, RARITY_GLOW, CharacterDef } from "@/lib/types";
import { StarRow, StatBar } from "./shared";
import gameData from "@/data/brainrot_game_data.json";
import { cardPowerScore } from "@/lib/utils";

const GAME_DATA = (gameData as unknown as { characters: Record<string, CharacterDef> }).characters;

export function InspectModal({ card, onClose, onFavorite, onDelete }: {
  card: OwnedCard; onClose: () => void;
  onFavorite: () => void; onDelete: () => void;
}) {
  const def = GAME_DATA[card.name] ?? null;
  const boost = 1 + (card.stars - 1) * 0.1;
  const hp  = Math.round(card.stats.rizz          * boost);
  const atk = Math.round(card.stats.brainrotPower * boost);
  const def2= Math.round(card.stats.sigmaAura     * boost);
  const man = Math.round(card.stats.npcEnergy     * boost);
  const pwr = cardPowerScore(card);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const moveKeys = ["basic", "special", "defense", "ultimate"] as const;
  const moveColors: Record<string, string> = { basic: "bg-zinc-700", special: "bg-blue-800", defense: "bg-green-800", ultimate: "bg-amber-800" };
  const moveIcons: Record<string, string>  = { basic: "⚔️", special: "✨", defense: "🛡️", ultimate: "💥" };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`relative w-full max-w-sm rounded-2xl border-2 bg-zinc-950 flex flex-col overflow-hidden ${RARITY_BORDER[card.rarity] ?? "border-zinc-700"} ${RARITY_GLOW[card.rarity] ?? ""}`}
        style={{ maxHeight: "90vh" }}>
        {/* Image header */}
        <div className="relative w-full" style={{ height: 200 }}>
          <Image src={card.image} alt={card.name} fill sizes="400px" style={{ objectFit: "cover" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 40%, rgba(9,9,11,0.95) 100%)" }} />
          {/* Close */}
          <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 rounded-full bg-zinc-900/80 flex items-center justify-center text-zinc-400 hover:text-white text-sm">✕</button>
          {/* Favorite badge */}
          {card.favorited && <span className="absolute top-3 left-3 text-lg">⭐</span>}
          {/* Name + rarity overlay */}
          <div className="absolute bottom-3 left-4 right-4">
            <p className="font-bold text-base leading-tight">{card.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full ${RARITY_STYLE[card.rarity] ?? ""}`}>{card.rarity}</span>
              <StarRow count={card.stars} />
              <span className="text-xs text-zinc-400 ml-auto">⚡ {pwr} pwr</span>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {/* Stats */}
          <div className="space-y-2">
            <p className="text-xs text-zinc-500 uppercase tracking-wide">Battle Stats</p>
            <StatBar label="Rizz (HP)"          value={hp}  max={300} color="bg-green-500" />
            <StatBar label="Brainrot Pow (ATK)"  value={atk} max={120} color="bg-red-500"   />
            <StatBar label="Sigma Aura (DEF)"    value={def2}max={100} color="bg-purple-500"/>
            <StatBar label="NPC Energy (MANA)"   value={man} max={150} color="bg-blue-500"  />
          </div>

          {/* Moves */}
          {def && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-500 uppercase tracking-wide">Moves</p>
              {moveKeys.map((mk) => {
                const move = def.moves[mk];
                return (
                  <div key={mk} className={`rounded-lg p-2.5 ${moveColors[mk]}/20 border border-${moveColors[mk].replace("bg-","")}/30`}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs">{moveIcons[mk]}</span>
                      <span className="text-xs font-semibold">{move.name}</span>
                      {move.power > 0 && <span className="text-xs text-zinc-400 ml-auto">PWR {move.power}</span>}
                    </div>
                    <p className="text-xs text-zinc-400 leading-tight">{move.effectText}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onFavorite}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all border
                ${card.favorited
                  ? "border-yellow-600 bg-yellow-900/30 text-yellow-300 hover:bg-yellow-900/50"
                  : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500"}`}>
              {card.favorited ? "⭐ Unfavorite" : "☆ Favorite"}
            </button>

            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)}
                className="flex-1 py-2 rounded-lg text-sm font-semibold border border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-red-700 hover:text-red-400 transition-all">
                🗑 Delete
              </button>
            ) : (
              <div className="flex-1 flex gap-1">
                <button onClick={onDelete}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold bg-red-700 text-white hover:bg-red-600 active:scale-95 transition-all">
                  Confirm
                </button>
                <button onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all">
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}