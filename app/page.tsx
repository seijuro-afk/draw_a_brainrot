"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import cards from "../data/brainrot.json";
import gameData from "../data/brainrot_game_data.json";
import { generateStats, CardStats } from "../lib/stats";
import Image from "next/image";

// ── Types ──────────────────────────────────────────────────────────────────
type Card = { name: string; rarity: string; image: string };
type OwnedCard = Card & { stats: CardStats; id: string; stars: number; obtainedAt: number };
type Tab = "packs" | "collection" | "battle" | "inventory" | "crafting" | "shop" | "refinery";
type BannerType = "regular" | "deluxe";
type SortMode = "power" | "rarity" | "date";
type ItemRarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";
type Item = { id: string; name: string; icon: string; rarity: ItemRarity; description: string; quantity: number };
type StatusEffectDef = {
  type: "buff" | "debuff"; name: string; chance: number; duration: number;
  effect: { stat?: string; value?: number; mode?: string; evadeChance?: number; missChance?: number; skipTurn?: boolean; blockDebuff?: boolean; disableMoves?: string[]; damageTakenMultiplier?: number; shield?: number; heal?: number; };
};
type MoveDef = { name: string; power: number; accuracy: number; effectText: string; statusEffects?: StatusEffectDef[] };
type CharacterDef = { rarity: string; stats: { hp: number; attack: number; defense: number; speed: number }; moves: { basic: MoveDef; special: MoveDef; defense: MoveDef; ultimate: MoveDef } };
const GAME_DATA = (gameData as unknown as { characters: Record<string, CharacterDef> }).characters;
type ActiveEffect = { name: string; turnsLeft: number; effect: StatusEffectDef["effect"]; type: "buff" | "debuff" };
type Combatant = { name: string; image: string; rarity: string; maxHp: number; hp: number; attack: number; defense: number; speed: number; mana: number; maxMana: number; effects: ActiveEffect[]; def: CharacterDef; stars: number };
type BattleLogEntry = { text: string; kind: "player" | "enemy" | "effect" | "info" | "item" };
type Recipe = { output: string; outputIcon: string; outputRarity: ItemRarity; ingredients: { name: string; icon: string; qty: number }[]; description: string };
type ShopItem = { name: string; icon: string; rarity: ItemRarity; costItem: string; costIcon: string; costQty: number; stock: number; maxStock: number; description: string };

// ── Constants ──────────────────────────────────────────────────────────────
const REGULAR_RATES  = { Common: 70, Rare: 24.7, Epic: 4.5, Legendary: 0.8 };
const REGULAR_PITY   = 500;
const DELUXE_RATES   = { Common: 55, Rare: 30, Epic: 11, Legendary: 4 };
const DELUXE_1_COST  = 100;
const DELUXE_10_COST = 1000;
const SHARD_WIN_MIN  = 20;
const SHARD_WIN_MAX  = 25;
const SHARD_LOSS     = 5;
const UPGRADE_COST   = 10;
const COOLDOWN_MS    = 60 * 1000;
const SHOP_RESTOCK_MS = 10 * 60 * 1000;

const ITEM_POOL: Omit<Item, "id" | "quantity">[] = [
  { name: "Sigma Stone",       icon: "💎", rarity: "Legendary", description: "Restores full HP and Mana in battle." },
  { name: "Rizz Elixir",       icon: "🧪", rarity: "Epic",      description: "Restores 50% HP in battle." },
  { name: "Brainrot Shard",    icon: "🪨", rarity: "Rare",      description: "A fragment of pure brainrot." },
  { name: "NPC Dust",          icon: "✨", rarity: "Uncommon",  description: "Swept from defeated NPCs." },
  { name: "Skibidi Token",     icon: "🪙", rarity: "Common",    description: "Shop currency. Minted from toilet vibes." },
  { name: "Aura Fragment",     icon: "🌀", rarity: "Rare",      description: "A piece of someone's lost aura." },
  { name: "Gyatt Gem",         icon: "💜", rarity: "Epic",      description: "Restores 50% Mana in battle." },
  { name: "Mewing Scroll",     icon: "📜", rarity: "Uncommon",  description: "Ancient mewing techniques." },
  { name: "Fanum Tax Receipt", icon: "🧾", rarity: "Common",    description: "Shop currency. Proof of food confiscation." },
  { name: "W Key",             icon: "🗝️", rarity: "Legendary", description: "Grants 1 free Deluxe pull when used." },
];
const BATTLE_USABLE = ["Sigma Stone", "Rizz Elixir", "Gyatt Gem"] as const;
type BattleUsable = typeof BATTLE_USABLE[number];

const RECIPES: Recipe[] = [
  { output: "Gyatt Gem",   outputIcon: "💜", outputRarity: "Epic",
    ingredients: [{ name: "Brainrot Shard", icon: "🪨", qty: 3 }, { name: "NPC Dust", icon: "✨", qty: 2 }],
    description: "Combine brainrot energy with NPC essence." },
  { output: "Rizz Elixir", outputIcon: "🧪", outputRarity: "Epic",
    ingredients: [{ name: "Aura Fragment", icon: "🌀", qty: 2 }, { name: "Mewing Scroll", icon: "📜", qty: 3 }],
    description: "Distill aura and mewing wisdom into pure rizz." },
];

const SHOP_CATALOG: Omit<ShopItem, "stock">[] = [
  { name: "Rizz Elixir",    icon: "🧪", rarity: "Epic",     costItem: "Skibidi Token",     costIcon: "🪙", costQty: 5, maxStock: 3, description: "Restores 50% HP in battle." },
  { name: "Gyatt Gem",      icon: "💜", rarity: "Epic",     costItem: "Skibidi Token",     costIcon: "🪙", costQty: 5, maxStock: 3, description: "Restores 50% Mana in battle." },
  { name: "Aura Fragment",  icon: "🌀", rarity: "Rare",     costItem: "Fanum Tax Receipt", costIcon: "🧾", costQty: 3, maxStock: 5, description: "Used in crafting." },
  { name: "Mewing Scroll",  icon: "📜", rarity: "Uncommon", costItem: "Fanum Tax Receipt", costIcon: "🧾", costQty: 2, maxStock: 5, description: "Used in crafting." },
  { name: "NPC Dust",       icon: "✨", rarity: "Uncommon", costItem: "Skibidi Token",     costIcon: "🪙", costQty: 2, maxStock: 8, description: "Used in crafting." },
  { name: "Brainrot Shard", icon: "🪨", rarity: "Rare",     costItem: "Fanum Tax Receipt", costIcon: "🧾", costQty: 4, maxStock: 4, description: "Spend on Deluxe pulls or craft." },
];

const RARITY_ORDER: Record<string, number> = { Common: 0, Uncommon: 1, Rare: 2, Epic: 3, Legendary: 4 };
const RARITY_STYLE: Record<string, string> = { Common: "bg-zinc-700 text-zinc-200", Rare: "bg-blue-900 text-blue-200", Epic: "bg-purple-900 text-purple-200", Legendary: "bg-amber-900 text-amber-200" };
const RARITY_BORDER: Record<string, string> = { Common: "border-zinc-700", Rare: "border-blue-700", Epic: "border-purple-600", Legendary: "border-amber-500" };
const RARITY_GLOW: Record<string, string> = { Common: "", Rare: "shadow-[0_0_18px_2px_rgba(59,130,246,0.25)]", Epic: "shadow-[0_0_18px_2px_rgba(168,85,247,0.3)]", Legendary: "shadow-[0_0_24px_4px_rgba(251,191,36,0.35)]" };
const ITEM_RARITY_STYLE: Record<ItemRarity, string> = { Common: "bg-zinc-700 text-zinc-200", Uncommon: "bg-green-900 text-green-200", Rare: "bg-blue-900 text-blue-200", Epic: "bg-purple-900 text-purple-200", Legendary: "bg-amber-900 text-amber-200" };
const ITEM_RARITY_BORDER: Record<ItemRarity, string> = { Common: "border-zinc-700", Uncommon: "border-green-700", Rare: "border-blue-700", Epic: "border-purple-600", Legendary: "border-amber-500" };

const NAV_ITEMS: { tab: Tab; label: string; icon: string }[] = [
  { tab: "packs",      label: "Packs",      icon: "📦" },
  { tab: "collection", label: "Collection", icon: "📖" },
  { tab: "battle",     label: "Battle",     icon: "⚔️"  },
  { tab: "inventory",  label: "Inventory",  icon: "🎒"  },
  { tab: "crafting",   label: "Crafting",   icon: "🔨"  },
  { tab: "shop",       label: "Shop",       icon: "🏪"  },
  { tab: "refinery",   label: "Refinery",   icon: "⚗️"  },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function formatTime(ms: number) { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }
function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }
function rollRarity(rates: Record<string, number>, pityCount: number, pityThreshold: number): string {
  if (pityCount >= pityThreshold - 1) return "Epic";
  const total = Object.values(rates).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (const [r, w] of Object.entries(rates)) { roll -= w; if (roll <= 0) return r; }
  return "Common";
}
function pickCard(rarity: string): Card {
  const pool = (cards as Card[]).filter((c) => c.rarity === rarity);
  const src = pool.length > 0 ? pool : (cards as Card[]);
  return src[Math.floor(Math.random() * src.length)];
}
function makeOwned(c: Card): OwnedCard { return { ...c, stats: generateStats(c.name, c.rarity), id: uid(), stars: 1, obtainedAt: Date.now() }; }
function weightedRandomItem(): Omit<Item, "id" | "quantity"> {
  const weights: Record<ItemRarity, number> = { Common: 50, Uncommon: 25, Rare: 15, Epic: 8, Legendary: 2 };
  const byRarity: Record<ItemRarity, typeof ITEM_POOL> = { Common: [], Uncommon: [], Rare: [], Epic: [], Legendary: [] };
  ITEM_POOL.forEach((i) => byRarity[i.rarity].push(i));
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (const r of ["Common", "Uncommon", "Rare", "Epic", "Legendary"] as ItemRarity[]) {
    roll -= weights[r]; if (roll <= 0) { const ch = byRarity[r]; return ch[Math.floor(Math.random() * ch.length)]; }
  }
  return ITEM_POOL[0];
}
function rollDrops(count: number): Item[] { return Array.from({ length: count }, () => ({ ...weightedRandomItem(), id: uid(), quantity: 1 })); }
function countItem(items: Item[], name: string): number { return items.filter((i) => i.name === name).length; }
function removeItems(items: Item[], name: string, qty: number): Item[] {
  let removed = 0;
  return items.filter((i) => { if (i.name === name && removed < qty) { removed++; return false; } return true; });
}
function addItem(items: Item[], name: string): Item[] {
  const def = ITEM_POOL.find((i) => i.name === name)!;
  return [...items, { ...def, id: uid(), quantity: 1 }];
}
function cardPowerScore(c: OwnedCard): number {
  const s = c.stats;
  return Math.round((s.brainrotPower + s.rizz + s.sigmaAura + s.npcEnergy) * (1 + (c.stars - 1) * 0.15));
}

// ── Battle Engine ──────────────────────────────────────────────────────────
function getCharDef(name: string, rarity: string): CharacterDef {
  if (GAME_DATA[name]) return GAME_DATA[name];
  const matches = Object.values(GAME_DATA).filter((c) => c.rarity === rarity);
  return matches.length > 0 ? matches[Math.floor(Math.random() * matches.length)] : Object.values(GAME_DATA)[0];
}
function makeCombatant(card: OwnedCard): Combatant {
  const def = getCharDef(card.name, card.rarity);
  const boost = 1 + (card.stars - 1) * 0.1;
  return {
    name: card.name, image: card.image, rarity: card.rarity,
    maxHp: Math.round(card.stats.rizz * boost), hp: Math.round(card.stats.rizz * boost),
    attack: Math.round(card.stats.brainrotPower * boost), defense: Math.round(card.stats.sigmaAura * boost),
    speed: def.stats.speed, mana: 0, maxMana: Math.round(card.stats.npcEnergy * boost),
    effects: [], def, stars: card.stars,
  };
}
function makeEnemyCombatant(): Combatant {
  const ec = (cards as Card[])[Math.floor(Math.random() * (cards as Card[]).length)];
  return makeCombatant({ ...ec, stats: generateStats(ec.name, ec.rarity), id: uid(), stars: Math.ceil(Math.random() * 3), obtainedAt: 0 });
}
type MoveKey = "basic" | "special" | "defense" | "ultimate";
const MOVE_MANA_PCT: Record<MoveKey, number> = { basic: 0, special: 0.20, defense: 0.15, ultimate: 0.50 };
const MOVE_GAIN_PCT: Record<MoveKey, number> = { basic: 0.20, special: 0.15, defense: 0.10, ultimate: 0 };
function moveCost(mk: MoveKey, c: Combatant) { return Math.round(MOVE_MANA_PCT[mk] * c.maxMana); }
function moveGain(mk: MoveKey, c: Combatant) { return Math.round(MOVE_GAIN_PCT[mk] * c.maxMana); }
const MOVE_ICONS: Record<MoveKey, string>  = { basic: "⚔️", special: "✨", defense: "🛡️", ultimate: "💥" };
const MOVE_COLORS: Record<MoveKey, string> = { basic: "border-zinc-600 hover:border-zinc-400 bg-zinc-900", special: "border-blue-700 hover:border-blue-500 bg-blue-950/40", defense: "border-green-700 hover:border-green-500 bg-green-950/30", ultimate: "border-amber-600 hover:border-amber-400 bg-amber-950/30" };

function applyStatusEffects(defs: StatusEffectDef[], target: Combatant, _src: Combatant, log: BattleLogEntry[]) {
  for (const se of defs) {
    if (se.type === "debuff" && target.effects.some((e) => e.effect.blockDebuff)) { log.push({ text: `${target.name} blocked ${se.name}!`, kind: "effect" }); continue; }
    if (Math.random() < se.chance) { target.effects.push({ name: se.name, turnsLeft: se.duration, effect: se.effect, type: se.type }); log.push({ text: `${target.name} gained ${se.name} (${se.duration}t)`, kind: "effect" }); }
  }
}
function tickEffects(c: Combatant, log: BattleLogEntry[]) {
  const next: ActiveEffect[] = [];
  for (const eff of c.effects) {
    if (eff.effect.stat === "hp" && eff.effect.mode === "per_turn") { const val = eff.effect.value ?? 0; c.hp = clamp(c.hp + val, 0, c.maxHp); log.push({ text: `${c.name}: ${eff.name} ${val < 0 ? "dealt" : "healed"} ${Math.abs(val)} HP`, kind: "effect" }); }
    if (typeof eff.effect.heal === "number") { c.hp = clamp(c.hp + eff.effect.heal, 0, c.maxHp); log.push({ text: `${c.name} healed ${eff.effect.heal} HP from ${eff.name}`, kind: "effect" }); }
    if (eff.turnsLeft - 1 > 0) next.push({ ...eff, turnsLeft: eff.turnsLeft - 1 }); else log.push({ text: `${c.name}: ${eff.name} wore off`, kind: "info" });
  }
  c.effects = next;
}
function calcDamage(attacker: Combatant, defender: Combatant, move: MoveDef): number {
  if (move.power === 0) return 0;
  const evade = defender.effects.find((e) => typeof e.effect.evadeChance === "number");
  if (evade && Math.random() < (evade.effect.evadeChance ?? 0)) return -1;
  if (Math.random() > move.accuracy) return -2;
  let atk = attacker.attack;
  for (const eff of attacker.effects) { if (eff.effect.stat === "attack" && eff.effect.mode === "percent") atk = Math.round(atk * (1 + (eff.effect.value ?? 0))); }
  let dmg = Math.max(1, Math.round((move.power * atk) / (defender.defense + 10)));
  for (const eff of defender.effects) { if (typeof eff.effect.damageTakenMultiplier === "number") dmg = Math.round(dmg * eff.effect.damageTakenMultiplier); }
  const shieldEff = defender.effects.find((e) => typeof e.effect.shield === "number");
  if (shieldEff && typeof shieldEff.effect.shield === "number") { const abs = Math.min(shieldEff.effect.shield, dmg); shieldEff.effect.shield! -= abs; dmg -= abs; if (shieldEff.effect.shield! <= 0) defender.effects = defender.effects.filter((e) => e !== shieldEff); }
  return Math.max(0, dmg);
}

// ── Shared UI ──────────────────────────────────────────────────────────────
function StarRow({ count, max = 5 }: { count: number; max?: number }) {
  return <div className="flex gap-0.5">{Array.from({ length: max }).map((_, i) => <span key={i} className={`text-xs ${i < count ? "text-amber-400" : "text-zinc-700"}`}>★</span>)}</div>;
}
function MiniCard({ c }: { c: OwnedCard }) {
  return (
    <div className={`rounded-xl border-2 bg-zinc-900 p-2 flex flex-col items-center gap-1.5 ${RARITY_BORDER[c.rarity] ?? "border-zinc-700"} ${RARITY_GLOW[c.rarity] ?? ""}`}>
      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-zinc-800"><Image src={c.image} alt={c.name} fill sizes="100px" style={{ objectFit: "cover" }} /></div>
      <p className="text-xs font-semibold text-center leading-tight w-full truncate">{c.name}</p>
      <StarRow count={c.stars} />
      <span className={`text-xs px-1.5 py-0.5 rounded-full ${RARITY_STYLE[c.rarity] ?? "bg-zinc-700 text-zinc-300"}`}>{c.rarity}</span>
    </div>
  );
}
function ShardBadge({ shards }: { shards: number }) {
  return <span className="inline-flex items-center gap-1 text-xs font-semibold bg-zinc-800 text-amber-300 px-2 py-0.5 rounded-full border border-amber-800">🪨 {shards.toLocaleString()}</span>;
}
function HpBar({ hp, maxHp }: { hp: number; maxHp: number }) {
  const pct = clamp((hp / maxHp) * 100, 0, 100);
  return <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-300 ${pct > 50 ? "bg-green-500" : pct > 25 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} /></div>;
}
function ManaBar({ mana, maxMana }: { mana: number; maxMana: number }) {
  return <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${(mana / maxMana) * 100}%` }} /></div>;
}
function EffectPills({ effects }: { effects: ActiveEffect[] }) {
  if (!effects.length) return null;
  return <div className="flex flex-wrap gap-1 mt-1">{effects.map((e, i) => <span key={i} className={`text-xs px-1.5 py-0.5 rounded-full border ${e.type === "buff" ? "bg-green-900/50 border-green-700 text-green-300" : "bg-red-900/50 border-red-700 text-red-300"}`}>{e.name} {e.turnsLeft}t</span>)}</div>;
}
function CombatantCard({ c, side }: { c: Combatant; side: "player" | "enemy" }) {
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

// ── Reveal Grid ────────────────────────────────────────────────────────────
function RevealGrid({ drawnCards, revealed, kept, onToggle, onKeep, onDiscard }: { drawnCards: OwnedCard[]; revealed: boolean[]; kept: boolean[]; onToggle: (i: number) => void; onKeep: () => void; onDiscard: () => void }) {
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

// ── Packs Tab ──────────────────────────────────────────────────────────────
function PacksTab({ shards, regularPity, onKeepCards, onSpendShards, onRegularPull, onUseWKey }: { shards: number; regularPity: number; onKeepCards: (c: OwnedCard[]) => void; onSpendShards: (n: number) => void; onRegularPull: (newPity: number) => void; onUseWKey: () => boolean }) {
  const [banner, setBanner] = useState<BannerType>("regular");
  const [phase, setPhase]   = useState<"select" | "reveal">("select");
  const [drawnCards, setDrawnCards] = useState<OwnedCard[]>([]);
  const [revealed, setRevealed]     = useState<boolean[]>([]);
  const [kept, setKept]             = useState<boolean[]>([]);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

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
    reveal([makeOwned(pickCard(rollRarity(REGULAR_RATES, newPity - 1, REGULAR_PITY)))]);
  }
  function pullDeluxe(count: 1 | 10) {
    const cost = count === 1 ? DELUXE_1_COST : DELUXE_10_COST;
    if (shards < cost) return;
    onSpendShards(cost);
    reveal(Array.from({ length: count }, () => makeOwned(pickCard(rollRarity(DELUXE_RATES, 0, 9999)))));
  }
  function pullWKey() { if (onUseWKey()) reveal([makeOwned(pickCard(rollRarity(DELUXE_RATES, 0, 9999)))]); }

  if (phase === "reveal") return <RevealGrid drawnCards={drawnCards} revealed={revealed} kept={kept} onToggle={(i) => setKept((p) => { const n = [...p]; n[i] = !n[i]; return n; })} onKeep={() => { const tk = drawnCards.filter((_, i) => kept[i]); if (tk.length) onKeepCards(tk); setPhase("select"); }} onDiscard={() => setPhase("select")} />;

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

// ── Collection Tab ─────────────────────────────────────────────────────────
function CollectionTab({ collection }: { collection: OwnedCard[] }) {
  if (!collection.length) return <div className="flex flex-col items-center gap-3 py-20 text-zinc-600"><span style={{ fontSize: 48 }}>📖</span><p className="text-sm">No cards yet — pull some!</p></div>;
  const unique = Object.values(collection.reduce<Record<string, OwnedCard>>((acc, c) => { if (!acc[c.name] || c.stars > acc[c.name].stars) acc[c.name] = c; return acc; }, {}));
  return <div className="w-full"><p className="text-sm text-zinc-500 mb-4">{unique.length} unique card{unique.length !== 1 ? "s" : ""}</p><div className="grid grid-cols-2 sm:grid-cols-3 gap-4">{unique.map((c) => <MiniCard key={c.name} c={c} />)}</div></div>;
}

// ── Battle Tab ─────────────────────────────────────────────────────────────
function BattleTab({ collection, items, onBattleEnd, onUseItem }: { collection: OwnedCard[]; items: Item[]; onBattleEnd: (drops: Item[], shards: number) => void; onUseItem: (name: string) => void }) {
  const [phase, setPhase]           = useState<"select" | "fighting">("select");
  const [sortMode, setSortMode]     = useState<SortMode>("power");
  const [playerCard, setPlayerCard] = useState<OwnedCard | null>(null);
  const [player, setPlayer]         = useState<Combatant | null>(null);
  const [enemy, setEnemy]           = useState<Combatant | null>(null);
  const [log, setLog]               = useState<BattleLogEntry[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [battleOver, setBattleOver]     = useState<null | "player" | "enemy">(null);
  const [pendingDrops, setPendingDrops] = useState<Item[]>([]);
  const [pendingShards, setPendingShards] = useState(0);
  const [enemyThinking, setEnemyThinking] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log]);

  const sorted = [...collection].sort((a, b) => sortMode === "power" ? cardPowerScore(b) - cardPowerScore(a) : sortMode === "rarity" ? (RARITY_ORDER[b.rarity] ?? 0) - (RARITY_ORDER[a.rarity] ?? 0) : b.obtainedAt - a.obtainedAt);
  function addLog(entries: BattleLogEntry[]) { setLog((prev) => [...prev, ...entries]); }

  function startBattle() {
    if (!playerCard) return;
    const p = makeCombatant(playerCard), e = makeEnemyCombatant();
    const pFirst = p.speed >= e.speed;
    setPlayer(p); setEnemy(e);
    setLog([{ text: `Battle start! ${p.name} vs ${e.name} — ${pFirst ? "you go first" : e.name + " goes first"}`, kind: "info" }]);
    setIsPlayerTurn(pFirst); setBattleOver(null); setEnemyThinking(false); setPhase("fighting");
    if (!pFirst) { setEnemyThinking(true); setTimeout(() => doEnemyTurn(p, e), 900); }
  }

  function useItemInBattle(itemName: BattleUsable) {
    if (!player || battleOver || !isPlayerTurn || enemyThinking || countItem(items, itemName) === 0) return;
    onUseItem(itemName);
    const np = { ...player, effects: [...player.effects] };
    const nl: BattleLogEntry[] = [];
    if (itemName === "Sigma Stone") { np.hp = np.maxHp; np.mana = np.maxMana; nl.push({ text: "💎 Sigma Stone — full HP & Mana restored!", kind: "item" }); }
    else if (itemName === "Rizz Elixir") { const h = Math.round(np.maxHp * 0.5); np.hp = clamp(np.hp + h, 0, np.maxHp); nl.push({ text: `🧪 Rizz Elixir — restored ${h} HP`, kind: "item" }); }
    else if (itemName === "Gyatt Gem") { const m = Math.round(np.maxMana * 0.5); np.mana = clamp(np.mana + m, 0, np.maxMana); nl.push({ text: `💜 Gyatt Gem — restored ${m} Mana`, kind: "item" }); }
    setPlayer(np); addLog(nl);
    if (enemy) { setIsPlayerTurn(false); setEnemyThinking(true); setTimeout(() => doEnemyTurn(np, enemy), 900); }
  }

  function executeMove(moveKey: MoveKey) {
    if (!player || !enemy || !isPlayerTurn || battleOver || enemyThinking) return;
    const move = player.def.moves[moveKey];
    const manaCost = moveCost(moveKey, player);
    if (player.mana < manaCost) { addLog([{ text: `Not enough mana for ${move.name}!`, kind: "info" }]); return; }
    const np = { ...player, effects: [...player.effects], mana: clamp(player.mana - manaCost + moveGain(moveKey, player), 0, player.maxMana) };
    const ne = { ...enemy,  effects: [...enemy.effects] };
    const nl: BattleLogEntry[] = [];
    nl.push({ text: `▶ You used ${move.name}`, kind: "player" });
    if (move.power > 0) {
      const dmg = calcDamage(np, ne, move);
      if (dmg === -1) nl.push({ text: `${ne.name} evaded!`, kind: "effect" });
      else if (dmg === -2) nl.push({ text: `${move.name} missed!`, kind: "info" });
      else { ne.hp = clamp(ne.hp - dmg, 0, ne.maxHp); nl.push({ text: `Dealt ${dmg} dmg to ${ne.name} (${ne.hp}/${ne.maxHp} HP)`, kind: "player" }); }
    }
    applyStatusEffects((move.statusEffects ?? []).filter((se) => se.type === "debuff"), ne, np, nl);
    applyStatusEffects((move.statusEffects ?? []).filter((se) => se.type === "buff"),   np, np, nl);
    if (ne.effects.some((e) => e.effect.skipTurn)) { nl.push({ text: `${ne.name} is stunned — skips turn!`, kind: "effect" }); ne.effects = ne.effects.filter((e) => !e.effect.skipTurn); }
    tickEffects(ne, nl); tickEffects(np, nl);
    setPlayer(np); setEnemy(ne); addLog(nl);
    if (ne.hp <= 0) { endBattle("player", np, ne); return; }
    if (np.hp <= 0) { endBattle("enemy",  np, ne); return; }
    setIsPlayerTurn(false); setEnemyThinking(true);
    setTimeout(() => doEnemyTurn(np, ne), 900);
  }

  function doEnemyTurn(cp: Combatant, ce: Combatant) {
    const np = { ...cp, effects: [...cp.effects] };
    const ne = { ...ce, effects: [...ce.effects] };
    const nl: BattleLogEntry[] = [];
    let mk: MoveKey = "basic";
    if (ne.hp < ne.maxHp * 0.3 && ne.mana >= moveCost("ultimate", ne)) mk = "ultimate";
    else if (ne.mana >= moveCost("special", ne) && Math.random() < 0.4) mk = "special";
    else if (ne.hp < ne.maxHp * 0.5 && ne.mana >= moveCost("defense", ne) && Math.random() < 0.3) mk = "defense";
    const move = ne.def.moves[mk];
    ne.mana = clamp(ne.mana - moveCost(mk, ne) + moveGain(mk, ne), 0, ne.maxMana);
    nl.push({ text: `◀ ${ne.name} used ${move.name}`, kind: "enemy" });
    if (move.power > 0) {
      const dmg = calcDamage(ne, np, move);
      if (dmg === -1) nl.push({ text: `You evaded!`, kind: "effect" });
      else if (dmg === -2) nl.push({ text: `${move.name} missed!`, kind: "info" });
      else { np.hp = clamp(np.hp - dmg, 0, np.maxHp); nl.push({ text: `Took ${dmg} dmg (${np.hp}/${np.maxHp} HP)`, kind: "player" }); }
    }
    applyStatusEffects((move.statusEffects ?? []).filter((se) => se.type === "debuff"), np, ne, nl);
    applyStatusEffects((move.statusEffects ?? []).filter((se) => se.type === "buff"),   ne, ne, nl);
    tickEffects(np, nl); tickEffects(ne, nl);
    setPlayer(np); setEnemy(ne); addLog(nl); setEnemyThinking(false);
    if (np.hp <= 0) { endBattle("enemy",  np, ne); return; }
    if (ne.hp <= 0) { endBattle("player", np, ne); return; }
    setIsPlayerTurn(true);
  }

  function endBattle(winner: "player" | "enemy", fp: Combatant, fe: Combatant) {
    const win = winner === "player";
    const drops = rollDrops(win ? Math.floor(Math.random() * 3) + 2 : 1);
    const shards = win ? Math.floor(Math.random() * (SHARD_WIN_MAX - SHARD_WIN_MIN + 1)) + SHARD_WIN_MIN : SHARD_LOSS;
    addLog([{ text: win ? `🏆 Victory! +${shards} 🪨 shards` : `💀 Defeated. +${shards} 🪨 consolation`, kind: "info" }]);
    setBattleOver(winner); setPendingDrops(drops); setPendingShards(shards);
  }
  function claimAndReset() { onBattleEnd(pendingDrops, pendingShards); setPhase("select"); setPlayer(null); setEnemy(null); setLog([]); setBattleOver(null); setPlayerCard(null); }

  if (phase === "select") {
    if (!collection.length) return <div className="flex flex-col items-center gap-3 py-20 text-zinc-600"><span style={{ fontSize: 48 }}>⚔️</span><p className="text-sm">Pull some cards first</p></div>;
    return (
      <div className="flex flex-col h-full" style={{ height: "calc(100vh - 200px)" }}>
        <div className="shrink-0 space-y-3 mb-3">
          <div className="flex items-center gap-2">
            <p className="text-xs text-zinc-500 uppercase tracking-wide flex-1">Choose your fighter</p>
            <div className="flex rounded-lg overflow-hidden border border-zinc-800 text-xs">
              {(["power", "rarity", "date"] as SortMode[]).map((m) => (
                <button key={m} onClick={() => setSortMode(m)} className={`px-2.5 py-1.5 font-medium capitalize transition-all ${sortMode === m ? "bg-zinc-700 text-white" : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"}`}>
                  {m === "power" ? "⚡ Power" : m === "rarity" ? "💎 Rarity" : "🕐 Date"}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-zinc-500">Win → earn <span className="text-amber-300 font-semibold">🪨 {SHARD_WIN_MIN}–{SHARD_WIN_MAX} shards</span> · Items usable mid-battle</div>
        </div>
        <div className="flex-1 overflow-y-auto pr-1 min-h-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-3">
            {sorted.map((c) => (
              <button key={c.id} onClick={() => setPlayerCard(playerCard?.id === c.id ? null : c)} className={`rounded-xl border-2 transition-all p-2 flex flex-col items-center gap-1.5 bg-zinc-900 ${playerCard?.id === c.id ? (RARITY_BORDER[c.rarity] ?? "border-zinc-700") + " scale-105 " + (RARITY_GLOW[c.rarity] ?? "") : "border-zinc-800 hover:border-zinc-600"}`}>
                <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-zinc-800"><Image src={c.image} alt={c.name} fill sizes="100px" style={{ objectFit: "cover" }} /></div>
                <p className="text-xs font-semibold text-center w-full truncate">{c.name}</p>
                <StarRow count={c.stars} />
                <p className="text-xs text-zinc-500">{cardPowerScore(c)} pwr</p>
              </button>
            ))}
          </div>
        </div>
        <div className="shrink-0 pt-3 border-t border-zinc-800">
          <button onClick={startBattle} disabled={!playerCard} className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${playerCard ? "bg-red-600 text-white hover:bg-red-500 active:scale-95" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}>{playerCard ? `Battle with ${playerCard.name}` : "Select a card to battle"}</button>
        </div>
      </div>
    );
  }

  if (player && enemy) {
    const moveKeys: MoveKey[] = ["basic", "special", "defense", "ultimate"];
    const battleItems = BATTLE_USABLE.map((name) => ({ name, count: countItem(items, name) })).filter((i) => i.count > 0);
    return (
      <div className="flex flex-col gap-3" style={{ height: "calc(100vh - 200px)" }}>
        <div className="flex gap-3 shrink-0">
          <CombatantCard c={player} side="player" />
          <div className="flex items-center justify-center text-xl font-black text-red-500 shrink-0">VS</div>
          <CombatantCard c={enemy} side="enemy" />
        </div>
        <div ref={logRef} className="flex-1 overflow-y-auto rounded-xl bg-zinc-900 border border-zinc-800 p-3 space-y-1 min-h-0">
          {log.map((entry, i) => <p key={i} className={`text-xs font-mono ${entry.kind === "player" ? "text-blue-300" : entry.kind === "enemy" ? "text-red-300" : entry.kind === "effect" ? "text-amber-300" : entry.kind === "item" ? "text-green-300" : "text-zinc-500"}`}>{entry.text}</p>)}
          {enemyThinking && <p className="text-xs text-zinc-600 italic animate-pulse">Enemy is thinking…</p>}
        </div>
        <div className="shrink-0 space-y-2">
          {battleOver ? (
            <div className="space-y-2">
              <div className={`rounded-xl border-2 p-3 text-center ${battleOver === "player" ? "border-green-600 bg-green-950/30" : "border-red-700 bg-red-950/20"}`}>
                <p className="font-black text-lg">{battleOver === "player" ? "🏆 Victory!" : "💀 Defeated"}</p>
                <p className="text-sm text-amber-300 font-semibold">+{pendingShards} 🪨 shards</p>
                {pendingDrops.length > 0 && <div className="flex flex-wrap gap-1.5 justify-center mt-2">{pendingDrops.map((item) => <span key={item.id} className={`text-xs px-2 py-0.5 rounded-full border ${ITEM_RARITY_BORDER[item.rarity]} ${ITEM_RARITY_STYLE[item.rarity]}`}>{item.icon} {item.name}</span>)}</div>}
              </div>
              <button onClick={claimAndReset} className="w-full py-2.5 rounded-xl font-semibold text-sm bg-white text-black hover:bg-zinc-200 active:scale-95 transition-all">Claim & battle again</button>
            </div>
          ) : (
            <>
              {battleItems.length > 0 && (
                <div className="flex gap-2 pb-1 flex-wrap">
                  {battleItems.map(({ name, count }) => {
                    const def = ITEM_POOL.find((i) => i.name === name)!;
                    const canUse = isPlayerTurn && !enemyThinking;
                    return <button key={name} onClick={() => useItemInBattle(name as BattleUsable)} disabled={!canUse} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${canUse ? "border-green-700 bg-green-950/30 text-green-300 hover:bg-green-900/50 active:scale-95" : "border-zinc-800 bg-zinc-900 text-zinc-600 cursor-not-allowed opacity-50"}`} title={def.description}>{def.icon} {name.split(" ")[0]} <span className="opacity-60">×{count}</span></button>;
                  })}
                </div>
              )}
              <p className="text-xs text-zinc-500 text-center">{isPlayerTurn ? "Your turn — pick a move" : "Enemy's turn…"}</p>
              <div className="grid grid-cols-2 gap-2">
                {moveKeys.map((mk) => {
                  const move = player.def.moves[mk];
                  const cost = moveCost(mk, player);
                  const disabled = !isPlayerTurn || !!battleOver || player.mana < cost || enemyThinking;
                  return (
                    <button key={mk} onClick={() => executeMove(mk)} disabled={disabled} className={`rounded-xl border-2 p-2.5 text-left transition-all ${disabled ? "border-zinc-800 bg-zinc-900 opacity-40 cursor-not-allowed" : MOVE_COLORS[mk] + " active:scale-95"}`}>
                      <div className="flex items-center justify-between mb-1"><span className="text-xs font-bold">{MOVE_ICONS[mk]} {move.name}</span>{cost > 0 && <span className="text-xs text-blue-400">{cost}MP</span>}</div>
                      <p className="text-xs text-zinc-400 leading-tight line-clamp-2">{move.effectText}</p>
                      {move.power > 0 && <p className="text-xs text-zinc-500 mt-1">PWR {move.power}</p>}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
  return null;
}

// ── Inventory Tab ──────────────────────────────────────────────────────────
function InventoryTab({ items, shards }: { items: Item[]; shards: number }) {
  const merged = Object.values(items.reduce<Record<string, Item>>((acc, item) => {
    if (acc[item.name]) acc[item.name] = { ...acc[item.name], quantity: acc[item.name].quantity + 1 }; else acc[item.name] = { ...item }; return acc;
  }, {})).sort((a, b) => { const o: ItemRarity[] = ["Legendary", "Epic", "Rare", "Uncommon", "Common"]; return o.indexOf(a.rarity) - o.indexOf(b.rarity); });
  return (
    <div className="w-full space-y-4">
      <div className="rounded-xl bg-zinc-900 border border-amber-800/60 p-4 flex items-center justify-between">
        <div><p className="text-sm font-semibold text-amber-300">Brainrot Shards</p><p className="text-xs text-zinc-500 mt-0.5">Earn by battling · spend on Deluxe pulls</p></div>
        <ShardBadge shards={shards} />
      </div>
      {merged.length === 0 ? <div className="flex flex-col items-center gap-3 py-16 text-zinc-600"><span style={{ fontSize: 48 }}>🎒</span><p className="text-sm">No items yet — win battles to earn drops</p></div> : (
        <>
          <p className="text-sm text-zinc-500">{items.length} item{items.length !== 1 ? "s" : ""} collected</p>
          {merged.map((item) => {
            const isBattle = (BATTLE_USABLE as readonly string[]).includes(item.name);
            const isWKey = item.name === "W Key";
            return (
              <div key={item.name} className={`flex items-center gap-4 rounded-xl border bg-zinc-900 p-3 ${ITEM_RARITY_BORDER[item.rarity]}`}>
                <span style={{ fontSize: 28 }}>{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{item.name}</p>
                    {item.quantity > 1 && <span className="text-xs bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded-full">×{item.quantity}</span>}
                    {isBattle && <span className="text-xs bg-green-900/50 border border-green-700 text-green-300 px-1.5 py-0.5 rounded-full">battle item</span>}
                    {isWKey   && <span className="text-xs bg-amber-900/50 border border-amber-700 text-amber-300 px-1.5 py-0.5 rounded-full">use in Packs</span>}
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{item.description}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${ITEM_RARITY_STYLE[item.rarity]}`}>{item.rarity}</span>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ── Crafting Tab ───────────────────────────────────────────────────────────
function CraftingTab({ items, onCraft }: { items: Item[]; onCraft: (recipe: Recipe) => void }) {
  return (
    <div className="w-full space-y-4">
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-1">
        <p className="text-sm font-semibold">Crafting</p>
        <p className="text-xs text-zinc-400">Combine items to craft powerful consumables for battle.</p>
      </div>
      {RECIPES.map((recipe) => {
        const canCraft = recipe.ingredients.every((ing) => countItem(items, ing.name) >= ing.qty);
        return (
          <div key={recipe.output} className={`rounded-xl border-2 bg-zinc-900 p-4 space-y-3 ${canCraft ? "border-purple-700" : "border-zinc-800"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 28 }}>{recipe.outputIcon}</span>
                <div><p className="font-semibold text-sm">{recipe.output}</p><span className={`text-xs px-1.5 py-0.5 rounded-full ${ITEM_RARITY_STYLE[recipe.outputRarity]}`}>{recipe.outputRarity}</span></div>
              </div>
              {canCraft && <span className="text-xs text-green-400 font-semibold">Ready ✓</span>}
            </div>
            <p className="text-xs text-zinc-500">{recipe.description}</p>
            <div className="space-y-2">
              <p className="text-xs text-zinc-500 uppercase tracking-wide">Ingredients</p>
              {recipe.ingredients.map((ing) => {
                const have = countItem(items, ing.name), ok = have >= ing.qty;
                return <div key={ing.name} className="flex items-center justify-between"><span className="text-sm">{ing.icon} <span className="text-xs text-zinc-300">{ing.name}</span></span><span className={`text-xs font-semibold ${ok ? "text-green-400" : "text-red-400"}`}>{have} / {ing.qty}</span></div>;
              })}
            </div>
            <button onClick={() => canCraft && onCraft(recipe)} disabled={!canCraft} className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all ${canCraft ? "bg-purple-600 text-white hover:bg-purple-500 active:scale-95" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}>{canCraft ? `Craft ${recipe.output}` : "Not enough materials"}</button>
          </div>
        );
      })}
    </div>
  );
}

// ── Shop Tab ───────────────────────────────────────────────────────────────
function ShopTab({ items, onBuy, shopStock, timeToRestock }: { items: Item[]; onBuy: (si: ShopItem) => void; shopStock: ShopItem[]; timeToRestock: number }) {
  const tokenCount   = countItem(items, "Skibidi Token");
  const receiptCount = countItem(items, "Fanum Tax Receipt");
  return (
    <div className="w-full space-y-4">
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">Your Currency</p>
          <span className="text-xs text-zinc-500">Restocks in <span className="text-white font-semibold">{formatTime(timeToRestock)}</span></span>
        </div>
        <div className="flex gap-4 text-sm"><span>🪙 <span className="font-semibold">{tokenCount}</span> Skibidi</span><span>🧾 <span className="font-semibold">{receiptCount}</span> Fanum</span></div>
      </div>
      <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full bg-amber-600 rounded-full transition-all" style={{ width: `${100 - (timeToRestock / SHOP_RESTOCK_MS) * 100}%` }} />
      </div>
      <div className="grid grid-cols-1 gap-3">
        {shopStock.map((si) => {
          const canAfford = countItem(items, si.costItem) >= si.costQty;
          const inStock   = si.stock > 0;
          const canBuy    = canAfford && inStock;
          return (
            <div key={si.name} className={`rounded-xl border bg-zinc-900 p-3 flex items-center gap-3 ${inStock ? ITEM_RARITY_BORDER[si.rarity] : "border-zinc-800 opacity-50"}`}>
              <span style={{ fontSize: 28 }}>{si.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><p className="font-semibold text-sm">{si.name}</p><span className={`text-xs px-1.5 py-0.5 rounded-full ${ITEM_RARITY_STYLE[si.rarity]}`}>{si.rarity}</span></div>
                <p className="text-xs text-zinc-500 mt-0.5">{si.description}</p>
                <p className="text-xs text-zinc-500 mt-1">Cost: {si.costIcon} {si.costQty} {si.costItem} · Stock: <span className={si.stock === 0 ? "text-red-400" : "text-green-400"}>{si.stock}/{si.maxStock}</span></p>
              </div>
              <button onClick={() => canBuy && onBuy(si)} disabled={!canBuy} className={`shrink-0 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${canBuy ? "bg-white text-black hover:bg-zinc-200 active:scale-95" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}>{!inStock ? "Sold out" : !canAfford ? "Can't afford" : "Buy"}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Refinery Tab ───────────────────────────────────────────────────────────
function RefineryTab({ collection, onUpgrade }: { collection: OwnedCard[]; onUpgrade: (targetId: string, sacrificeIds: string[]) => void }) {
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

// ── Main Page ──────────────────────────────────────────────────────────────
function initShopStock(): ShopItem[] { return SHOP_CATALOG.map((s) => ({ ...s, stock: s.maxStock })); }

export default function Home() {
  const [activeTab,      setActiveTab]      = useState<Tab>("packs");
  const [collection,     setCollection]     = useState<OwnedCard[]>([]);
  const [items,          setItems]          = useState<Item[]>([]);
  const [shards,         setShards]         = useState(0);
  const [regularPity,    setRegularPity]    = useState(0);
  const [shopStock,      setShopStock]      = useState<ShopItem[]>(initShopStock());
  const [restockAt,      setRestockAt]      = useState<number>(Date.now() + SHOP_RESTOCK_MS);
  const [timeToRestock,  setTimeToRestock]  = useState(SHOP_RESTOCK_MS);

  useEffect(() => {
    const c = localStorage.getItem("collection"); const i = localStorage.getItem("items");
    const s = localStorage.getItem("shards");     const p = localStorage.getItem("regularPity");
    const ss= localStorage.getItem("shopStock");  const sr= localStorage.getItem("restockAt");
    if (c) setCollection(JSON.parse(c)); if (i) setItems(JSON.parse(i));
    if (s) setShards(Number(s));         if (p) setRegularPity(Number(p));
    if (ss) setShopStock(JSON.parse(ss));
    if (sr) {
      const at = Number(sr);
      if (at > Date.now()) { setRestockAt(at); }
      else { const next = Date.now() + SHOP_RESTOCK_MS; const fresh = initShopStock(); setRestockAt(next); setShopStock(fresh); localStorage.setItem("shopStock", JSON.stringify(fresh)); localStorage.setItem("restockAt", String(next)); }
    } else { const next = Date.now() + SHOP_RESTOCK_MS; setRestockAt(next); localStorage.setItem("restockAt", String(next)); }
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      const rem = restockAt - Date.now();
      if (rem <= 0) { const next = Date.now() + SHOP_RESTOCK_MS; const fresh = initShopStock(); setRestockAt(next); setShopStock(fresh); setTimeToRestock(SHOP_RESTOCK_MS); localStorage.setItem("shopStock", JSON.stringify(fresh)); localStorage.setItem("restockAt", String(next)); }
      else setTimeToRestock(rem);
    }, 1000);
    return () => clearInterval(iv);
  }, [restockAt]);

  const saveCollection  = useCallback((c: OwnedCard[]) => { setCollection(c);  localStorage.setItem("collection",  JSON.stringify(c)); }, []);
  const saveItems       = useCallback((i: Item[])      => { setItems(i);        localStorage.setItem("items",       JSON.stringify(i)); }, []);
  const saveShards      = useCallback((n: number)      => { setShards(n);       localStorage.setItem("shards",      String(n)); }, []);
  const saveRegularPity = useCallback((n: number)      => { setRegularPity(n);  localStorage.setItem("regularPity", String(n)); }, []);
  const saveShopStock   = useCallback((ss: ShopItem[]) => { setShopStock(ss);   localStorage.setItem("shopStock",   JSON.stringify(ss)); }, []);

  function handleKeepCards(newCards: OwnedCard[]) { saveCollection([...collection, ...newCards]); }
  function handleSpendShards(n: number) { saveShards(Math.max(0, shards - n)); }
  function handleBattleEnd(drops: Item[], earned: number) { saveItems([...items, ...drops]); saveShards(shards + earned); }
  function handleUpgrade(targetId: string, sacrificeIds: string[]) {
    saveCollection(collection.filter((c) => !sacrificeIds.includes(c.id)).map((c) => c.id === targetId ? { ...c, stars: Math.min(5, c.stars + 1) } : c));
  }
  function handleUseWKey(): boolean { if (countItem(items, "W Key") === 0) return false; saveItems(removeItems(items, "W Key", 1)); return true; }
  function handleUseItem(name: string) { saveItems(removeItems(items, name, 1)); }
  function handleCraft(recipe: Recipe) {
    let ni = [...items];
    for (const ing of recipe.ingredients) ni = removeItems(ni, ing.name, ing.qty);
    saveItems(addItem(ni, recipe.output));
  }
  function handleBuy(si: ShopItem) {
    if (countItem(items, si.costItem) < si.costQty || si.stock <= 0) return;
    saveItems(addItem(removeItems(items, si.costItem, si.costQty), si.name));
    saveShopStock(shopStock.map((s) => s.name === si.name ? { ...s, stock: s.stock - 1 } : s));
  }

  const uniqueCards = new Set(collection.map((c) => c.name)).size;

  return (
    <div className="min-h-screen flex bg-zinc-950 text-white">
      <aside className="w-52 shrink-0 flex flex-col border-r border-zinc-800 bg-zinc-950 py-8 px-3 gap-1">
        <h1 className="text-base font-bold tracking-tight px-3 mb-4">🧠 Brainrot</h1>
        {NAV_ITEMS.map(({ tab, label, icon }) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${activeTab === tab ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"}`}>
            <span style={{ fontSize: 18 }}>{icon}</span>{label}
          </button>
        ))}
        <div className="mt-auto px-3 pt-4 border-t border-zinc-800 space-y-1.5">
          <div className="flex items-center justify-between"><p className="text-xs text-zinc-600">Shards</p><ShardBadge shards={shards} /></div>
          <p className="text-xs text-zinc-600">Cards: <span className="text-zinc-400 font-medium">{collection.length}</span></p>
          <p className="text-xs text-zinc-600">Unique: <span className="text-zinc-400 font-medium">{uniqueCards}</span></p>
          <p className="text-xs text-zinc-600">Items: <span className="text-zinc-400 font-medium">{items.length}</span></p>
        </div>
      </aside>
      <main className="flex-1 flex flex-col p-8 overflow-hidden">
        <div className="w-full max-w-lg mx-auto flex flex-col h-full">
          <div className="mb-6 shrink-0"><h2 className="text-2xl font-bold tracking-tight">{NAV_ITEMS.find((n) => n.tab === activeTab)?.label}</h2></div>
          <div className={`flex-1 min-h-0 ${activeTab === "battle" ? "overflow-hidden" : "overflow-y-auto"}`}>
            {activeTab === "packs"      && <PacksTab shards={shards} regularPity={regularPity} onKeepCards={handleKeepCards} onSpendShards={handleSpendShards} onRegularPull={saveRegularPity} onUseWKey={handleUseWKey} />}
            {activeTab === "collection" && <CollectionTab collection={collection} />}
            {activeTab === "battle"     && <BattleTab collection={collection} items={items} onBattleEnd={handleBattleEnd} onUseItem={handleUseItem} />}
            {activeTab === "inventory"  && <InventoryTab items={items} shards={shards} />}
            {activeTab === "crafting"   && <CraftingTab items={items} onCraft={handleCraft} />}
            {activeTab === "shop"       && <ShopTab items={items} onBuy={handleBuy} shopStock={shopStock} timeToRestock={timeToRestock} />}
            {activeTab === "refinery"   && <RefineryTab collection={collection} onUpgrade={handleUpgrade} />}
          </div>
        </div>
      </main>
    </div>
  );
}