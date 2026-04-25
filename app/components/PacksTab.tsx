import { useEffect, useState } from "react";
import { OwnedCard, BannerType, REGULAR_RATES, REGULAR_PITY, DELUXE_RATES, DELUXE_1_COST, DELUXE_10_COST, COOLDOWN_MS, RARITY_STYLE } from "@/lib/types";
import { RevealGrid } from "./RevealGrid";
import { ShardBadge } from "./shared";
import { formatTime, rollRarity, pickCard, makeOwned } from "@/lib/utils";

export function PacksTab({ shards, regularPity, onKeepCards, onSpendShards, onRegularPull, onUseWKey }: { shards: number; regularPity: number; onKeepCards: (c: OwnedCard[], source: "regular" | "deluxe" | "wkey") => void; onSpendShards: (n: number) => void; onRegularPull: (newPity: number) => void; onUseWKey: () => boolean }) {
  const [banner, setBanner] = useState<BannerType>("regular");
  const [phase, setPhase]   = useState<"select" | "reveal">("select");
  const [drawnCards, setDrawnCards] = useState<OwnedCard[]>([]);
  const [revealed, setRevealed]     = useState<boolean[]>([]);
  const [kept, setKept]             = useState<boolean[]>([]);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [pullSource, setPullSource] = useState<'regular' | 'deluxe' | 'wkey'>('regular');

  useEffect(() => {
    const saved = localStorage.getItem("regularCooldown");
    if (saved) { const until = Number(saved); if (until > Date.now()) setCooldownUntil(until); else localStorage.removeItem("regularCooldown"); }
  }, []);
  useEffect(() => {
    if (!cooldownUntil) return;
    const iv = setInterval(() => { const rem = cooldownUntil - Date.now(); if (rem <= 0) { setCooldownUntil(null); setTimeLeft(0); localStorage.removeItem("regularCooldown"); } else setTimeLeft(rem); }, 500);
    return () => clearInterval(iv);
  }, [cooldownUntil]);

  const isCooldown = !!(cooldownUntil && cooldownUntil > Date.now());

  function reveal(result: OwnedCard[]) {
    setDrawnCards(result); setRevealed(Array(result.length).fill(false)); setKept(Array(result.length).fill(false)); setPhase("reveal");
    result.forEach((_, i) => setTimeout(() => setRevealed((p) => { const n = [...p]; n[i] = true; return n; }), i * 380 + 250));
  }
  function pullRegular() {
    if (isCooldown) return;
    const newPity = regularPity + 1;
    onRegularPull(newPity >= REGULAR_PITY ? 0 : newPity);
    const until = Date.now() + COOLDOWN_MS;
    setCooldownUntil(until); localStorage.setItem("regularCooldown", String(until));
    setPullSource('regular');
    reveal([makeOwned(pickCard(rollRarity(REGULAR_RATES, newPity - 1, REGULAR_PITY)))]);
  }
  function pullDeluxe(count: 1 | 10) {
    const cost = count === 1 ? DELUXE_1_COST : DELUXE_10_COST;
    if (shards < cost) return;
    onSpendShards(cost);
    setPullSource('deluxe');
    reveal(Array.from({ length: count }, () => makeOwned(pickCard(rollRarity(DELUXE_RATES, 0, 9999)))));
  }
  function pullWKey() { if (onUseWKey()) { setPullSource('wkey'); reveal([makeOwned(pickCard(rollRarity(DELUXE_RATES, 0, 9999)))]); } }

  if (phase === "reveal") return <RevealGrid drawnCards={drawnCards} revealed={revealed} kept={kept} onToggle={(i) => setKept((p) => { const n = [...p]; n[i] = !n[i]; return n; })} onKeep={() => { const tk = drawnCards.filter((_, i) => kept[i]); if (tk.length) onKeepCards(tk, pullSource); setPhase("select"); }} onDiscard={() => setPhase("select")} />;

  return (
    <div className="space-y-6">
      <div className="flex rounded-xl overflow-hidden border border-zinc-800">
        <button onClick={() => setBanner("regular")} className={`flex-1 py-2.5 text-sm font-semibold transition-all ${banner === "regular" ? "bg-zinc-700 text-white" : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"}`}>🃏 Regular</button>
        <button onClick={() => setBanner("deluxe")}  className={`flex-1 py-2.5 text-sm font-semibold transition-all ${banner === "deluxe"  ? "bg-amber-600 text-black" : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"}`}>✨ Deluxe</button>
      </div>
      {banner === "regular" ? (
        <div className="space-y-4">
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
            <div className="flex items-center justify-between"><p className="text-sm font-semibold">Regular Banner</p><span className="text-xs text-zinc-500">1 pull per minute</span></div>
            <div className="grid grid-cols-2 gap-2 text-xs">{Object.entries(REGULAR_RATES).map(([r, w]) => <div key={r} className="flex justify-between"><span className={`px-2 py-0.5 rounded-full ${RARITY_STYLE[r] ?? ""}`}>{r}</span><span className="text-zinc-400">{w}%</span></div>)}</div>
            <div className="border-t border-zinc-800 pt-3">
              <div className="flex justify-between text-xs mb-1"><span className="text-zinc-400">Pity</span><span className="font-medium">{regularPity} / {REGULAR_PITY}</span></div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${(regularPity / REGULAR_PITY) * 100}%` }} /></div>
              <p className="text-xs text-zinc-600 mt-1">Guaranteed Epic at {REGULAR_PITY} pulls</p>
            </div>
          </div>
          <button onClick={pullRegular} disabled={isCooldown} className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${isCooldown ? "bg-zinc-700 text-zinc-400 cursor-not-allowed" : "bg-white text-black hover:bg-zinc-200 active:scale-95"}`}>{isCooldown ? `Next pull in ${formatTime(timeLeft)}` : "Pull (Free)"}</button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl bg-zinc-900 border border-amber-800/50 p-4 space-y-3">
            <div className="flex items-center justify-between"><p className="text-sm font-semibold text-amber-300">Deluxe Banner</p><ShardBadge shards={shards} /></div>
            <div className="grid grid-cols-2 gap-2 text-xs">{Object.entries(DELUXE_RATES).map(([r, w]) => <div key={r} className="flex justify-between"><span className={`px-2 py-0.5 rounded-full ${RARITY_STYLE[r] ?? ""}`}>{r}</span><span className="text-zinc-400">{w}%</span></div>)}</div>
            <p className="text-xs text-zinc-500 border-t border-zinc-800 pt-2">Earn 🪨 by winning battles. Top-up coming soon.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => pullDeluxe(1)}  disabled={shards < DELUXE_1_COST}  className={`py-3 rounded-xl font-semibold text-sm flex flex-col items-center gap-0.5 transition-all ${shards >= DELUXE_1_COST  ? "bg-amber-600 text-black hover:bg-amber-500 active:scale-95" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}><span>1 Pull</span><span className="text-xs font-normal opacity-80">🪨 {DELUXE_1_COST}</span></button>
            <button onClick={() => pullDeluxe(10)} disabled={shards < DELUXE_10_COST} className={`py-3 rounded-xl font-semibold text-sm flex flex-col items-center gap-0.5 transition-all ${shards >= DELUXE_10_COST ? "bg-amber-500 text-black hover:bg-amber-400 active:scale-95" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}><span>10 Pull</span><span className="text-xs font-normal opacity-80">🪨 {DELUXE_10_COST}</span></button>
          </div>
          <button onClick={pullWKey} className="w-full py-2.5 rounded-xl font-semibold text-sm border border-amber-700 text-amber-300 hover:bg-amber-900/20 active:scale-95 transition-all">🗝️ Use W Key (free Deluxe pull)</button>
          {shards < DELUXE_1_COST && <p className="text-xs text-zinc-500 text-center">Need {DELUXE_1_COST - shards} more shards. Win battles!</p>}
        </div>
      )}
    </div>
  );
}