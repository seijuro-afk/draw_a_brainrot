import Image from "next/image";
import { RARITY_STYLE, RARITY_BORDER, RARITY_GLOW, ITEM_RARITY_STYLE, ITEM_RARITY_BORDER, ActiveEffect, Combatant, OwnedCard } from "@/lib/types";

// ── Shared UI ──────────────────────────────────────────────────────────────
export function StarRow({ count, max = 5 }: { count: number; max?: number }) {
  return <div className="flex gap-0.5">{Array.from({ length: max }).map((_, i) => <span key={i} className={`text-xs ${i < count ? "text-amber-400" : "text-zinc-700"}`}>★</span>)}</div>;
}
export function MiniCard({ c }: { c: OwnedCard }) {
  return (
    <div className={`rounded-xl border-2 bg-zinc-900 p-2 flex flex-col items-center gap-1.5 ${RARITY_BORDER[c.rarity] ?? "border-zinc-700"} ${RARITY_GLOW[c.rarity] ?? ""}`}>
      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-zinc-800"><Image src={c.image} alt={c.name} fill sizes="100px" style={{ objectFit: "cover" }} /></div>
      <p className="text-xs font-semibold text-center leading-tight w-full truncate">{c.name}</p>
      <StarRow count={c.stars} />
      <span className={`text-xs px-1.5 py-0.5 rounded-full ${RARITY_STYLE[c.rarity] ?? "bg-zinc-700 text-zinc-300"}`}>{c.rarity}</span>
    </div>
  );
}
export function ShardBadge({ shards }: { shards: number }) {
  return <span className="inline-flex items-center gap-1 text-xs font-semibold bg-zinc-800 text-amber-300 px-2 py-0.5 rounded-full border border-amber-800">🪨 {shards.toLocaleString()}</span>;
}
export function HpBar({ hp, maxHp }: { hp: number; maxHp: number }) {
  const pct = Math.min(100, (hp / maxHp) * 100);
  return <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-300 ${pct > 50 ? "bg-green-500" : pct > 25 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} /></div>;
}
export function ManaBar({ mana, maxMana }: { mana: number; maxMana: number }) {
  return <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${(mana / maxMana) * 100}%` }} /></div>;
}
export function EffectPills({ effects }: { effects: ActiveEffect[] }) {
  if (!effects.length) return null;
  return <div className="flex flex-wrap gap-1 mt-1">{effects.map((e, i) => <span key={i} className={`text-xs px-1.5 py-0.5 rounded-full border ${e.type === "buff" ? "bg-green-900/50 border-green-700 text-green-300" : "bg-red-900/50 border-red-700 text-red-300"}`}>{e.name} {e.turnsLeft}t</span>)}</div>;
}
export function CombatantCard({ c, side }: { c: Combatant; side: "player" | "enemy" }) {
  return (
    <div className={`flex-1 rounded-xl border bg-zinc-900 p-3 flex flex-col gap-2 ${RARITY_BORDER[c.rarity] ?? "border-zinc-700"} ${RARITY_GLOW[c.rarity] ?? ""}`}>
      <div className="flex items-center gap-2">
        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 shrink-0"><Image src={c.image} alt={c.name} fill sizes="48px" style={{ objectFit: "cover" }} /></div>
        <div className="flex-1 min-w-0"><p className="text-xs font-semibold truncate">{c.name}</p><StarRow count={c.stars} /></div>
        {side === "enemy" && <span className="text-xs text-zinc-500">Enemy</span>}
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs"><span className="text-zinc-400">Rizz</span><span className="font-medium">{Math.max(0, c.hp)}/{c.maxHp}</span></div>
        <HpBar hp={c.hp} maxHp={c.maxHp} />
        <div className="flex justify-between text-xs mt-1"><span className="text-zinc-400">NPC Energy</span><span className="font-medium">{c.mana}/{c.maxMana}</span></div>
        <ManaBar mana={c.mana} maxMana={c.maxMana} />
      </div>
      <EffectPills effects={c.effects} />
      <div className="grid grid-cols-2 gap-1 text-xs text-zinc-500 mt-1"><span>ATK {c.attack}</span><span>DEF {c.defense}</span></div>
    </div>
  );
}

// ── Stat Bar ───────────────────────────────────────────────────────────────
export function StatBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-zinc-400">{label}</span>
        <span className="font-medium text-zinc-200">{value}</span>
      </div>
      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
      </div>
    </div>
  );
}