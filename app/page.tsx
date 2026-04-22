"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import cards from "../data/brainrot.json";
import gameData from "../data/brainrot_game_data.json";
import { generateStats, CardStats } from "../lib/stats";
import Image from "next/image";

// ── Types ──────────────────────────────────────────────────────────────────
type Card = { name: string; rarity: string; image: string };
type OwnedCard = Card & { stats: CardStats; id: string; stars: number; obtainedAt: number };
type Tab = "packs" | "collection" | "battle" | "inventory" | "refinery";
type BannerType = "regular" | "deluxe";
type SortMode = "power" | "rarity" | "date";

type ItemRarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";
type Item = { id: string; name: string; icon: string; rarity: ItemRarity; description: string; quantity: number };

// ── Game Data Types ────────────────────────────────────────────────────────
type StatusEffectDef = {
  type: "buff" | "debuff";
  name: string;
  chance: number;
  duration: number;
  effect: {
    stat?: string; value?: number; mode?: string;
    evadeChance?: number; missChance?: number; skipTurn?: boolean;
    blockDebuff?: boolean; disableMoves?: string[];
    damageTakenMultiplier?: number; shield?: number; heal?: number;
  };
};
type MoveDef = {
  name: string; power: number; accuracy: number;
  effectText: string; statusEffects?: StatusEffectDef[];
};
type CharacterDef = {
  rarity: string;
  stats: { hp: number; attack: number; defense: number; speed: number };
  moves: { basic: MoveDef; special: MoveDef; defense: MoveDef; ultimate: MoveDef };
};

const GAME_DATA = (gameData as unknown as { characters: Record<string, CharacterDef> }).characters;

// ── Battle Engine Types ────────────────────────────────────────────────────
type ActiveEffect = {
  name: string; turnsLeft: number;
  effect: StatusEffectDef["effect"];
  type: "buff" | "debuff";
};
type Combatant = {
  name: string; image: string; rarity: string;
  maxHp: number; hp: number; attack: number; defense: number; speed: number;
  mana: number; maxMana: number;
  effects: ActiveEffect[];
  def: CharacterDef;
  stars: number;
};

type BattleLogEntry = { text: string; kind: "player" | "enemy" | "effect" | "info" };

// ── Pull Rates ─────────────────────────────────────────────────────────────
const REGULAR_RATES = { Common: 70, Rare: 24.7, Epic: 4.5, Legendary: 0.8 };
const REGULAR_PITY  = 500;
const DELUXE_RATES  = { Common: 55, Rare: 30, Epic: 11, Legendary: 4 };
const DELUXE_1_COST  = 100;
const DELUXE_10_COST = 1000;
const SHARD_WIN_MIN  = 20;
const SHARD_WIN_MAX  = 25;
const SHARD_LOSS     = 5;
const UPGRADE_COST   = 10;
const COOLDOWN_MS    = 60 * 1000;

// ── Item Pool ──────────────────────────────────────────────────────────────
const ITEM_POOL: Omit<Item, "id" | "quantity">[] = [
  { name: "Sigma Stone",       icon: "💎", rarity: "Legendary", description: "Crystallized sigma energy." },
  { name: "Rizz Elixir",       icon: "🧪", rarity: "Epic",      description: "Bottled rizz. Smells expensive." },
  { name: "Brainrot Shard",    icon: "🪨", rarity: "Rare",      description: "A fragment of pure brainrot." },
  { name: "NPC Dust",          icon: "✨", rarity: "Uncommon",  description: "Swept from defeated NPCs." },
  { name: "Skibidi Token",     icon: "🪙", rarity: "Common",    description: "Minted from toilet vibes." },
  { name: "Aura Fragment",     icon: "🌀", rarity: "Rare",      description: "A piece of someone's lost aura." },
  { name: "Gyatt Gem",         icon: "💜", rarity: "Epic",      description: "Don't ask where this came from." },
  { name: "Mewing Scroll",     icon: "📜", rarity: "Uncommon",  description: "Ancient mewing techniques." },
  { name: "Fanum Tax Receipt", icon: "🧾", rarity: "Common",    description: "Proof of food confiscation." },
  { name: "W Key",             icon: "🗝️", rarity: "Legendary", description: "Only winners hold it." },
];

const ITEM_RARITY_WEIGHTS: Record<ItemRarity, number> = { Common: 50, Uncommon: 25, Rare: 15, Epic: 8, Legendary: 2 };

// ── Style Maps ─────────────────────────────────────────────────────────────
const RARITY_ORDER: Record<string, number> = { Common: 0, Uncommon: 1, Rare: 2, Epic: 3, Legendary: 4 };

const RARITY_STYLE: Record<string, string> = {
  Common: "bg-zinc-700 text-zinc-200", Rare: "bg-blue-900 text-blue-200",
  Epic: "bg-purple-900 text-purple-200", Legendary: "bg-amber-900 text-amber-200",
};
const RARITY_BORDER: Record<string, string> = {
  Common: "border-zinc-700", Rare: "border-blue-700",
  Epic: "border-purple-600", Legendary: "border-amber-500",
};
const RARITY_GLOW: Record<string, string> = {
  Common: "", Rare: "shadow-[0_0_18px_2px_rgba(59,130,246,0.25)]",
  Epic: "shadow-[0_0_18px_2px_rgba(168,85,247,0.3)]",
  Legendary: "shadow-[0_0_24px_4px_rgba(251,191,36,0.35)]",
};
const ITEM_RARITY_STYLE: Record<ItemRarity, string> = {
  Common: "bg-zinc-700 text-zinc-200", Uncommon: "bg-green-900 text-green-200",
  Rare: "bg-blue-900 text-blue-200", Epic: "bg-purple-900 text-purple-200",
  Legendary: "bg-amber-900 text-amber-200",
};
const ITEM_RARITY_BORDER: Record<ItemRarity, string> = {
  Common: "border-zinc-700", Uncommon: "border-green-700",
  Rare: "border-blue-700", Epic: "border-purple-600", Legendary: "border-amber-500",
};

const NAV_ITEMS: { tab: Tab; label: string; icon: string }[] = [
  { tab: "packs",      label: "Packs",      icon: "📦" },
  { tab: "collection", label: "Collection", icon: "📖" },
  { tab: "battle",     label: "Battle",     icon: "⚔️"  },
  { tab: "inventory",  label: "Inventory",  icon: "🎒"  },
  { tab: "refinery",   label: "Refinery",   icon: "⚗️"  },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function formatTime(ms: number) {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
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
  const src  = pool.length > 0 ? pool : (cards as Card[]);
  return src[Math.floor(Math.random() * src.length)];
}

function makeOwned(c: Card): OwnedCard {
  return { ...c, stats: generateStats(c.name, c.rarity), id: uid(), stars: 1, obtainedAt: Date.now() };
}

function weightedRandomItem(): Omit<Item, "id" | "quantity"> {
  const byRarity: Record<ItemRarity, typeof ITEM_POOL> = { Common: [], Uncommon: [], Rare: [], Epic: [], Legendary: [] };
  ITEM_POOL.forEach((i) => byRarity[i.rarity].push(i));
  const total = Object.values(ITEM_RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (const r of ["Common", "Uncommon", "Rare", "Epic", "Legendary"] as ItemRarity[]) {
    roll -= ITEM_RARITY_WEIGHTS[r];
    if (roll <= 0) { const ch = byRarity[r]; return ch[Math.floor(Math.random() * ch.length)]; }
  }
  return ITEM_POOL[0];
}
function rollDrops(count: number): Item[] {
  return Array.from({ length: count }, () => ({ ...weightedRandomItem(), id: uid(), quantity: 1 }));
}

function cardPowerScore(c: OwnedCard): number {
  const s = c.stats;
  // brainrotPower=attack, rizz=hp, sigmaAura=defense, npcEnergy=mana — all flat numbers
  return Math.round((s.brainrotPower + s.rizz + s.sigmaAura + s.npcEnergy) * (1 + (c.stars - 1) * 0.15));
}

// ── Battle Engine ──────────────────────────────────────────────────────────
function getCharDef(name: string, rarity: string): CharacterDef {
  // Try exact match first, then find by rarity as fallback
  if (GAME_DATA[name]) return GAME_DATA[name];
  const matches = Object.values(GAME_DATA).filter((c) => c.rarity === rarity);
  return matches.length > 0 ? matches[Math.floor(Math.random() * matches.length)] : Object.values(GAME_DATA)[0];
}

function makeCombatant(card: OwnedCard): Combatant {
  const def   = getCharDef(card.name, card.rarity);
  const boost = 1 + (card.stars - 1) * 0.1;
  return {
    // Map CardStats flat numbers: brainrotPower→attack, rizz→hp, sigmaAura→defense, npcEnergy→maxMana
    name: card.name, image: card.image, rarity: card.rarity,
    maxHp:   Math.round(card.stats.rizz          * boost),
    hp:      Math.round(card.stats.rizz          * boost),
    attack:  Math.round(card.stats.brainrotPower * boost),
    defense: Math.round(card.stats.sigmaAura     * boost),
    speed:   def.stats.speed,
    mana: 0, maxMana: Math.round(card.stats.npcEnergy * boost),
    effects: [],
    def, stars: card.stars,
  };
}

function makeEnemyCombatant(): Combatant {
  const enemyCards = cards as Card[];
  const ec = enemyCards[Math.floor(Math.random() * enemyCards.length)];
  const owned: OwnedCard = {
    ...ec,
    stats: generateStats(ec.name, ec.rarity),
    id: uid(), stars: Math.ceil(Math.random() * 3), obtainedAt: 0,
  };
  return makeCombatant(owned);
}

type MoveKey = "basic" | "special" | "defense" | "ultimate";
// Mana costs as % of maxMana so they scale with npcEnergy across all rarities
const MOVE_MANA_PCT: Record<MoveKey, number> = { basic: 0, special: 0.20, defense: 0.15, ultimate: 0.50 };
const MOVE_GAIN_PCT: Record<MoveKey, number> = { basic: 0.20, special: 0.15, defense: 0.10, ultimate: 0 };
function moveCost(mk: MoveKey, c: Combatant) { return Math.round(MOVE_MANA_PCT[mk] * c.maxMana); }
function moveGain(mk: MoveKey, c: Combatant) { return Math.round(MOVE_GAIN_PCT[mk] * c.maxMana); }
const MOVE_ICONS: Record<MoveKey, string> = { basic: "⚔️", special: "✨", defense: "🛡️", ultimate: "💥" };
const MOVE_COLORS: Record<MoveKey, string> = {
  basic:   "border-zinc-600 hover:border-zinc-400 bg-zinc-900",
  special: "border-blue-700 hover:border-blue-500 bg-blue-950/40",
  defense: "border-green-700 hover:border-green-500 bg-green-950/30",
  ultimate:"border-amber-600 hover:border-amber-400 bg-amber-950/30",
};
const MOVE_ACTIVE: Record<MoveKey, string> = {
  basic:   "border-zinc-300 bg-zinc-800",
  special: "border-blue-400 bg-blue-900/60",
  defense: "border-green-400 bg-green-900/50",
  ultimate:"border-amber-400 bg-amber-900/50",
};

function applyStatusEffects(def: StatusEffectDef[], target: Combatant, source: Combatant, log: BattleLogEntry[], side: "player" | "enemy") {
  for (const se of def) {
    // Check blockDebuff
    if (se.type === "debuff" && target.effects.some((e) => e.effect.blockDebuff)) {
      log.push({ text: `${target.name} blocked the ${se.name}!`, kind: "effect" });
      continue;
    }
    if (Math.random() < se.chance) {
      target.effects.push({ name: se.name, turnsLeft: se.duration, effect: se.effect, type: se.type });
      log.push({ text: `${target.name} gained ${se.name} (${se.duration} turns)`, kind: "effect" });
    }
  }
}

function tickEffects(c: Combatant, log: BattleLogEntry[], side: "player" | "enemy") {
  const next: ActiveEffect[] = [];
  for (const eff of c.effects) {
    // Apply per-turn effects
    if (eff.effect.stat === "hp" && eff.effect.mode === "per_turn") {
      const val = eff.effect.value ?? 0;
      c.hp = clamp(c.hp + val, 0, c.maxHp);
      log.push({ text: `${c.name}: ${eff.name} ${val < 0 ? "dealt" : "healed"} ${Math.abs(val)} HP`, kind: "effect" });
    }
    if (typeof eff.effect.heal === "number") {
      c.hp = clamp(c.hp + eff.effect.heal, 0, c.maxHp);
      log.push({ text: `${c.name} healed ${eff.effect.heal} HP from ${eff.name}`, kind: "effect" });
    }
    if (eff.turnsLeft - 1 > 0) next.push({ ...eff, turnsLeft: eff.turnsLeft - 1 });
    else log.push({ text: `${c.name}: ${eff.name} wore off`, kind: "info" });
  }
  c.effects = next;
}

function calcDamage(attacker: Combatant, defender: Combatant, move: MoveDef): number {
  if (move.power === 0) return 0;
  // Check miss/evade
  const evade = defender.effects.find((e) => typeof e.effect.evadeChance === "number");
  if (evade && Math.random() < (evade.effect.evadeChance ?? 0)) return -1; // -1 = evaded
  if (Math.random() > move.accuracy) return -2; // -2 = missed

  let atk = attacker.attack;
  // Apply attack debuffs
  for (const eff of attacker.effects) {
    if (eff.effect.stat === "attack" && eff.effect.mode === "percent") {
      atk = Math.round(atk * (1 + (eff.effect.value ?? 0)));
    }
  }

  let dmg = Math.max(1, Math.round((move.power * atk) / (defender.defense + 10)));

  // damageTakenMultiplier
  for (const eff of defender.effects) {
    if (typeof eff.effect.damageTakenMultiplier === "number") {
      dmg = Math.round(dmg * eff.effect.damageTakenMultiplier);
    }
  }

  // Shield
  const shieldEff = defender.effects.find((e) => typeof e.effect.shield === "number");
  if (shieldEff && typeof shieldEff.effect.shield === "number") {
    const absorbed = Math.min(shieldEff.effect.shield, dmg);
    shieldEff.effect.shield! -= absorbed;
    dmg -= absorbed;
    if (shieldEff.effect.shield! <= 0) {
      defender.effects = defender.effects.filter((e) => e !== shieldEff);
    }
  }

  return Math.max(0, dmg);
}

// ── Shared UI ──────────────────────────────────────────────────────────────
function StarRow({ count, max = 5 }: { count: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={`text-xs ${i < count ? "text-amber-400" : "text-zinc-700"}`}>★</span>
      ))}
    </div>
  );
}

function MiniCard({ c }: { c: OwnedCard }) {
  return (
    <div className={`rounded-xl border-2 bg-zinc-900 p-2 flex flex-col items-center gap-1.5 ${RARITY_BORDER[c.rarity] ?? "border-zinc-700"} ${RARITY_GLOW[c.rarity] ?? ""}`}>
      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-zinc-800">
        <Image src={c.image} alt={c.name} fill sizes="100px" style={{ objectFit: "cover" }} />
      </div>
      <p className="text-xs font-semibold text-center leading-tight w-full truncate">{c.name}</p>
      <StarRow count={c.stars} />
      <span className={`text-xs px-1.5 py-0.5 rounded-full ${RARITY_STYLE[c.rarity] ?? "bg-zinc-700 text-zinc-300"}`}>{c.rarity}</span>
    </div>
  );
}

function ShardBadge({ shards }: { shards: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-zinc-800 text-amber-300 px-2 py-0.5 rounded-full border border-amber-800">
      🪨 {shards.toLocaleString()}
    </span>
  );
}

function HpBar({ hp, maxHp, color = "bg-green-500" }: { hp: number; maxHp: number; color?: string }) {
  const pct = clamp((hp / maxHp) * 100, 0, 100);
  const barColor = pct > 50 ? "bg-green-500" : pct > 25 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
      <div className={`h-full ${barColor} rounded-full transition-all duration-300`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function ManaBar({ mana, maxMana }: { mana: number; maxMana: number }) {
  return (
    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
      <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${(mana / maxMana) * 100}%` }} />
    </div>
  );
}

function EffectPills({ effects }: { effects: ActiveEffect[] }) {
  if (effects.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {effects.map((e, i) => (
        <span key={i} className={`text-xs px-1.5 py-0.5 rounded-full border ${e.type === "buff" ? "bg-green-900/50 border-green-700 text-green-300" : "bg-red-900/50 border-red-700 text-red-300"}`}>
          {e.name} {e.turnsLeft}t
        </span>
      ))}
    </div>
  );
}

function CombatantCard({ c, side }: { c: Combatant; side: "player" | "enemy" }) {
  return (
    <div className={`flex-1 rounded-xl border bg-zinc-900 p-3 flex flex-col gap-2 ${RARITY_BORDER[c.rarity] ?? "border-zinc-700"} ${RARITY_GLOW[c.rarity] ?? ""}`}>
      <div className="flex items-center gap-2">
        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
          <Image src={c.image} alt={c.name} fill sizes="48px" style={{ objectFit: "cover" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate">{c.name}</p>
          <div className="flex gap-1 mt-0.5">
            <StarRow count={c.stars} />
          </div>
        </div>
        {side === "enemy" && <span className="text-xs text-zinc-500">Enemy</span>}
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-zinc-400">Rizz</span>
          <span className="font-medium">{Math.max(0, c.hp)}/{c.maxHp}</span>
        </div>
        <HpBar hp={c.hp} maxHp={c.maxHp} />
        <div className="flex justify-between text-xs mt-1">
          <span className="text-zinc-400">NPC Energy</span>
          <span className="font-medium">{c.mana}/{c.maxMana}</span>
        </div>
        <ManaBar mana={c.mana} maxMana={c.maxMana} />
      </div>
      <EffectPills effects={c.effects} />
      <div className="grid grid-cols-2 gap-1 text-xs text-zinc-500 mt-1">
        <span>BrainrotPow {c.attack}</span>
        <span>Aura {c.defense}</span>
      </div>
    </div>
  );
}

// ── Reveal Grid ────────────────────────────────────────────────────────────
function RevealGrid({ drawnCards, revealed, kept, onToggle, onKeep, onDiscard }: {
  drawnCards: OwnedCard[]; revealed: boolean[]; kept: boolean[];
  onToggle: (i: number) => void; onKeep: () => void; onDiscard: () => void;
}) {
  const keptCount = kept.filter(Boolean).length;
  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-400 text-center">Tap cards to keep them</p>
      <div className={`grid gap-3 ${drawnCards.length <= 1 ? "grid-cols-1 max-w-[160px] mx-auto" : drawnCards.length <= 3 ? "grid-cols-3" : "grid-cols-5"}`}>
        {drawnCards.map((c, i) => (
          <button key={c.id} onClick={() => revealed[i] && onToggle(i)}
            className={`rounded-xl border-2 transition-all duration-300 overflow-hidden
              ${!revealed[i] ? "bg-zinc-800 border-zinc-700"
                : kept[i] ? (RARITY_BORDER[c.rarity] ?? "border-zinc-700") + " " + (RARITY_GLOW[c.rarity] ?? "") + " scale-105"
                : "border-zinc-700 bg-zinc-900 opacity-60"}`}
            style={{ aspectRatio: "3/4" }}>
            {!revealed[i] ? (
              <div className="w-full h-full flex items-center justify-center text-3xl bg-zinc-800">🃏</div>
            ) : (
              <div className="flex flex-col items-center gap-1 p-2 h-full">
                <div className="relative w-full flex-1 rounded-lg overflow-hidden bg-zinc-800">
                  <Image src={c.image} alt={c.name} fill sizes="80px" style={{ objectFit: "cover" }} />
                </div>
                <p className="text-xs font-semibold text-center leading-tight w-full truncate">{c.name}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${RARITY_STYLE[c.rarity] ?? "bg-zinc-700 text-zinc-300"}`}>{c.rarity}</span>
                {kept[i] && <span className="text-xs text-green-400 font-bold">✓</span>}
              </div>
            )}
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={onKeep} disabled={keptCount === 0}
          className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all
            ${keptCount > 0 ? "bg-amber-500 text-black hover:bg-amber-400 active:scale-95" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}>
          Keep {keptCount > 0 ? `${keptCount} card${keptCount !== 1 ? "s" : ""}` : "selected"}
        </button>
        <button onClick={onDiscard}
          className="px-4 py-3 rounded-xl text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-600 transition-all">
          Discard all
        </button>
      </div>
    </div>
  );
}

// ── Packs Tab ──────────────────────────────────────────────────────────────
function PacksTab({ shards, regularPity, onKeepCards, onSpendShards, onRegularPull }: {
  shards: number; regularPity: number;
  onKeepCards: (c: OwnedCard[]) => void;
  onSpendShards: (n: number) => void;
  onRegularPull: (newPity: number) => void;
}) {
  const [banner, setBanner] = useState<BannerType>("regular");
  const [phase, setPhase]   = useState<"select" | "reveal">("select");
  const [drawnCards, setDrawnCards] = useState<OwnedCard[]>([]);
  const [revealed, setRevealed]     = useState<boolean[]>([]);
  const [kept, setKept]             = useState<boolean[]>([]);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [timeLeft, setTimeLeft]           = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("regularCooldown");
    if (saved) {
      const until = Number(saved);
      if (until > Date.now()) setCooldownUntil(until);
      else localStorage.removeItem("regularCooldown");
    }
  }, []);

  useEffect(() => {
    if (!cooldownUntil) return;
    const iv = setInterval(() => {
      const rem = cooldownUntil - Date.now();
      if (rem <= 0) { setCooldownUntil(null); setTimeLeft(0); localStorage.removeItem("regularCooldown"); }
      else setTimeLeft(rem);
    }, 500);
    return () => clearInterval(iv);
  }, [cooldownUntil]);

  const isCooldown = !!(cooldownUntil && cooldownUntil > Date.now());

  function reveal(result: OwnedCard[]) {
    setDrawnCards(result); setRevealed(Array(result.length).fill(false));
    setKept(Array(result.length).fill(false)); setPhase("reveal");
    result.forEach((_, i) => setTimeout(() => {
      setRevealed((prev) => { const n = [...prev]; n[i] = true; return n; });
    }, i * 380 + 250));
  }

  function pullRegular() {
    if (isCooldown) return;
    const newPity = regularPity + 1;
    const rarity  = rollRarity(REGULAR_RATES, newPity - 1, REGULAR_PITY);
    onRegularPull(newPity >= REGULAR_PITY ? 0 : newPity);
    const until = Date.now() + COOLDOWN_MS;
    setCooldownUntil(until); localStorage.setItem("regularCooldown", String(until));
    reveal([makeOwned(pickCard(rarity))]);
  }

  function pullDeluxe(count: 1 | 10) {
    const cost = count === 1 ? DELUXE_1_COST : DELUXE_10_COST;
    if (shards < cost) return;
    onSpendShards(cost);
    reveal(Array.from({ length: count }, () => makeOwned(pickCard(rollRarity(DELUXE_RATES, 0, 9999)))));
  }

  if (phase === "reveal") {
    return <RevealGrid drawnCards={drawnCards} revealed={revealed} kept={kept}
      onToggle={(i) => setKept((p) => { const n = [...p]; n[i] = !n[i]; return n; })}
      onKeep={() => { const tk = drawnCards.filter((_, i) => kept[i]); if (tk.length) onKeepCards(tk); setPhase("select"); }}
      onDiscard={() => setPhase("select")} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex rounded-xl overflow-hidden border border-zinc-800">
        <button onClick={() => setBanner("regular")}
          className={`flex-1 py-2.5 text-sm font-semibold transition-all ${banner === "regular" ? "bg-zinc-700 text-white" : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"}`}>
          🃏 Regular
        </button>
        <button onClick={() => setBanner("deluxe")}
          className={`flex-1 py-2.5 text-sm font-semibold transition-all ${banner === "deluxe" ? "bg-amber-600 text-black" : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"}`}>
          ✨ Deluxe
        </button>
      </div>

      {banner === "regular" ? (
        <div className="space-y-4">
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Regular Banner</p>
              <span className="text-xs text-zinc-500">1 pull per minute</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(REGULAR_RATES).map(([r, w]) => (
                <div key={r} className="flex justify-between">
                  <span className={`px-2 py-0.5 rounded-full ${RARITY_STYLE[r] ?? "bg-zinc-700 text-zinc-300"}`}>{r}</span>
                  <span className="text-zinc-400">{w}%</span>
                </div>
              ))}
            </div>
            <div className="border-t border-zinc-800 pt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-400">Pity counter</span>
                <span className="font-medium">{regularPity} / {REGULAR_PITY}</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${(regularPity / REGULAR_PITY) * 100}%` }} />
              </div>
              <p className="text-xs text-zinc-600 mt-1">Guaranteed Epic at {REGULAR_PITY} pulls</p>
            </div>
          </div>
          <button onClick={pullRegular} disabled={isCooldown}
            className={`w-full py-3 rounded-xl font-semibold text-sm transition-all
              ${isCooldown ? "bg-zinc-700 text-zinc-400 cursor-not-allowed" : "bg-white text-black hover:bg-zinc-200 active:scale-95"}`}>
            {isCooldown ? `Next pull in ${formatTime(timeLeft)}` : "Pull (Free)"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl bg-zinc-900 border border-amber-800/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-amber-300">Deluxe Banner</p>
              <ShardBadge shards={shards} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(DELUXE_RATES).map(([r, w]) => (
                <div key={r} className="flex justify-between">
                  <span className={`px-2 py-0.5 rounded-full ${RARITY_STYLE[r] ?? "bg-zinc-700 text-zinc-300"}`}>{r}</span>
                  <span className="text-zinc-400">{w}%</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-500 border-t border-zinc-800 pt-2">
              Earn 🪨 by winning battles ({SHARD_WIN_MIN}–{SHARD_WIN_MAX}/win). Top-up coming soon.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => pullDeluxe(1)} disabled={shards < DELUXE_1_COST}
              className={`py-3 rounded-xl font-semibold text-sm transition-all flex flex-col items-center gap-0.5
                ${shards >= DELUXE_1_COST ? "bg-amber-600 text-black hover:bg-amber-500 active:scale-95" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}>
              <span>1 Pull</span><span className="text-xs font-normal opacity-80">🪨 {DELUXE_1_COST}</span>
            </button>
            <button onClick={() => pullDeluxe(10)} disabled={shards < DELUXE_10_COST}
              className={`py-3 rounded-xl font-semibold text-sm transition-all flex flex-col items-center gap-0.5
                ${shards >= DELUXE_10_COST ? "bg-amber-500 text-black hover:bg-amber-400 active:scale-95" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}>
              <span>10 Pull</span><span className="text-xs font-normal opacity-80">🪨 {DELUXE_10_COST}</span>
            </button>
          </div>
          {shards < DELUXE_1_COST && (
            <p className="text-xs text-zinc-500 text-center">Need {DELUXE_1_COST - shards} more shards. Win battles!</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Collection Tab ─────────────────────────────────────────────────────────
function CollectionTab({ collection }: { collection: OwnedCard[] }) {
  if (collection.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-zinc-600">
        <span style={{ fontSize: 48 }}>📖</span>
        <p className="text-sm">No cards yet — pull some!</p>
      </div>
    );
  }
  const unique = Object.values(
    collection.reduce<Record<string, OwnedCard>>((acc, c) => {
      if (!acc[c.name] || c.stars > acc[c.name].stars) acc[c.name] = c;
      return acc;
    }, {})
  );
  return (
    <div className="w-full">
      <p className="text-sm text-zinc-500 mb-4">{unique.length} unique card{unique.length !== 1 ? "s" : ""}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {unique.map((c) => <MiniCard key={c.name} c={c} />)}
      </div>
    </div>
  );
}

// ── Battle Tab ─────────────────────────────────────────────────────────────
type BattlePhase = "select" | "fighting" | "result";

function BattleTab({ collection, onBattleEnd }: {
  collection: OwnedCard[];
  onBattleEnd: (drops: Item[], shards: number) => void;
}) {
  const [phase, setPhase]         = useState<BattlePhase>("select");
  const [sortMode, setSortMode]   = useState<SortMode>("power");
  const [playerCard, setPlayerCard] = useState<OwnedCard | null>(null);

  // Battle state
  const [player, setPlayer]   = useState<Combatant | null>(null);
  const [enemy, setEnemy]     = useState<Combatant | null>(null);
  const [log, setLog]         = useState<BattleLogEntry[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [battleOver, setBattleOver]     = useState<null | "player" | "enemy">(null);
  const [pendingDrops, setPendingDrops] = useState<Item[]>([]);
  const [pendingShards, setPendingShards] = useState(0);
  const [enemyThinking, setEnemyThinking] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  const sorted = [...collection].sort((a, b) => {
    if (sortMode === "power")  return cardPowerScore(b) - cardPowerScore(a);
    if (sortMode === "rarity") return (RARITY_ORDER[b.rarity] ?? 0) - (RARITY_ORDER[a.rarity] ?? 0);
    return b.obtainedAt - a.obtainedAt;
  });

  function startBattle() {
    if (!playerCard) return;
    const p = makeCombatant(playerCard);
    const e = makeEnemyCombatant();
    const playerGoesFirst = p.speed >= e.speed;
    setPlayer(p); setEnemy(e);
    setLog([{
      text: `Battle start! ${p.name} vs ${e.name} — ${playerGoesFirst ? "you go first" : e.name + " goes first"}`,
      kind: "info",
    }]);
    setIsPlayerTurn(playerGoesFirst);
    setBattleOver(null); setEnemyThinking(false);
    setPhase("fighting");
    // If enemy is faster, trigger their opening turn
    if (!playerGoesFirst) {
      setEnemyThinking(true);
      setTimeout(() => doEnemyTurn(p, e), 900);
    }
  }

  function addLog(entries: BattleLogEntry[]) {
    setLog((prev) => [...prev, ...entries]);
  }

  function executeMove(moveKey: MoveKey) {
    if (!player || !enemy || !isPlayerTurn || battleOver || enemyThinking) return;

    const move = player.def.moves[moveKey];
    const manaCost = moveCost(moveKey, player);
    if (player.mana < manaCost) {
      addLog([{ text: `Not enough mana for ${move.name}! (need ${manaCost})`, kind: "info" }]);
      return;
    }

    const newPlayer = { ...player, effects: [...player.effects], mana: clamp(player.mana - manaCost + moveGain(moveKey, player), 0, player.maxMana) };
    const newEnemy  = { ...enemy,  effects: [...enemy.effects]  };
    const newLog: BattleLogEntry[] = [];

    newLog.push({ text: `▶ You used ${move.name}`, kind: "player" });

    if (move.power > 0) {
      const dmg = calcDamage(newPlayer, newEnemy, move);
      if (dmg === -1) newLog.push({ text: `${newEnemy.name} evaded the attack!`, kind: "effect" });
      else if (dmg === -2) newLog.push({ text: `${move.name} missed!`, kind: "info" });
      else {
        newEnemy.hp = clamp(newEnemy.hp - dmg, 0, newEnemy.maxHp);
        newLog.push({ text: `Gave ${dmg} brainrot damage to ${newEnemy.name} (${newEnemy.hp}/${newEnemy.maxHp} Rizz)`, kind: "player" });
      }
    }

    // Status effects on enemy (debuffs) and self (buffs)
    const debuffs = (move.statusEffects ?? []).filter((se) => se.type === "debuff");
    const buffs   = (move.statusEffects ?? []).filter((se) => se.type === "buff");
    applyStatusEffects(debuffs, newEnemy, newPlayer, newLog, "player");
    applyStatusEffects(buffs,   newPlayer, newPlayer, newLog, "player");

    // Check skip
    if (newEnemy.effects.some((e) => e.effect.skipTurn)) {
      newLog.push({ text: `${newEnemy.name} is stunned and skips their turn!`, kind: "effect" });
      newEnemy.effects = newEnemy.effects.map((e) =>
        e.effect.skipTurn ? { ...e, effect: { ...e.effect, skipTurn: false }, turnsLeft: 0 } : e
      ).filter((e) => e.turnsLeft > 0);
    }

    // Tick effects end of turn
    tickEffects(newEnemy, newLog, "enemy");
    tickEffects(newPlayer, newLog, "player");


    setPlayer(newPlayer); setEnemy(newEnemy);
    addLog(newLog);

    if (newEnemy.hp <= 0) { endBattle("player", newPlayer, newEnemy); return; }
    if (newPlayer.hp <= 0) { endBattle("enemy", newPlayer, newEnemy); return; }

    setIsPlayerTurn(false);
    setEnemyThinking(true);
    setTimeout(() => doEnemyTurn(newPlayer, newEnemy), 900);
  }

  function doEnemyTurn(currentPlayer: Combatant, currentEnemy: Combatant) {
    const newPlayer = { ...currentPlayer, effects: [...currentPlayer.effects] };
    const newEnemy  = { ...currentEnemy,  effects: [...currentEnemy.effects], mana: currentEnemy.mana };
    const newLog: BattleLogEntry[] = [];

    // Enemy AI: pick move based on mana/hp
    let moveKey: MoveKey = "basic";
    if (newEnemy.hp < newEnemy.maxHp * 0.3 && newEnemy.mana >= moveCost("ultimate", newEnemy)) moveKey = "ultimate";
    else if (newEnemy.mana >= moveCost("special", newEnemy) && Math.random() < 0.4) moveKey = "special";
    else if (newEnemy.hp < newEnemy.maxHp * 0.5 && newEnemy.mana >= moveCost("defense", newEnemy) && Math.random() < 0.3) moveKey = "defense";
    else moveKey = "basic";

    const move = newEnemy.def.moves[moveKey];
    newEnemy.mana = clamp(newEnemy.mana - moveCost(moveKey, newEnemy) + moveGain(moveKey, newEnemy), 0, newEnemy.maxMana);

    newLog.push({ text: `◀ ${newEnemy.name} used ${move.name}`, kind: "enemy" });

    if (move.power > 0) {
      const dmg = calcDamage(newEnemy, newPlayer, move);
      if (dmg === -1) newLog.push({ text: `You evaded the attack!`, kind: "effect" });
      else if (dmg === -2) newLog.push({ text: `${move.name} missed!`, kind: "info" });
      else {
        newPlayer.hp = clamp(newPlayer.hp - dmg, 0, newPlayer.maxHp);
        newLog.push({ text: `Took ${dmg} brainrot damage (${newPlayer.hp}/${newPlayer.maxHp} Rizz)`, kind: "player" });
      }
    }

    const debuffs = (move.statusEffects ?? []).filter((se) => se.type === "debuff");
    const buffs   = (move.statusEffects ?? []).filter((se) => se.type === "buff");
    applyStatusEffects(debuffs, newPlayer, newEnemy, newLog, "enemy");
    applyStatusEffects(buffs,   newEnemy,  newEnemy, newLog, "enemy");

    tickEffects(newPlayer, newLog, "player");
    tickEffects(newEnemy,  newLog, "enemy");

    setPlayer(newPlayer); setEnemy(newEnemy);
    addLog(newLog);
    setEnemyThinking(false);

    if (newPlayer.hp <= 0) { endBattle("enemy", newPlayer, newEnemy); return; }
    if (newEnemy.hp <= 0)  { endBattle("player", newPlayer, newEnemy); return; }
    setIsPlayerTurn(true);
  }

  function endBattle(winner: "player" | "enemy", finalPlayer: Combatant, finalEnemy: Combatant) {
    const win    = winner === "player";
    const drops  = rollDrops(win ? Math.floor(Math.random() * 3) + 2 : 1);
    const shards = win ? Math.floor(Math.random() * (SHARD_WIN_MAX - SHARD_WIN_MIN + 1)) + SHARD_WIN_MIN : SHARD_LOSS;
    addLog([{
      text: win ? `🏆 Victory! +${shards} 🪨 shards earned` : `💀 Defeated. +${shards} 🪨 consolation`,
      kind: "info",
    }]);
    setBattleOver(winner);
    setPendingDrops(drops);
    setPendingShards(shards);
  }

  function claimAndReset() {
    onBattleEnd(pendingDrops, pendingShards);
    setPhase("select"); setPlayer(null); setEnemy(null);
    setLog([]); setBattleOver(null); setPlayerCard(null);
  }

  // ── Select Phase ───────────────────────────────────────────────────────
  if (phase === "select") {
    if (collection.length === 0) {
      return (
        <div className="flex flex-col items-center gap-3 py-20 text-zinc-600">
          <span style={{ fontSize: 48 }}>⚔️</span>
          <p className="text-sm">Pull some cards first to battle</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full" style={{ height: "calc(100vh - 200px)" }}>
        {/* Header + sort — fixed */}
        <div className="shrink-0 space-y-3 mb-3">
          <div className="flex items-center gap-2">
            <p className="text-xs text-zinc-500 uppercase tracking-wide flex-1">Choose your fighter</p>
            <div className="flex rounded-lg overflow-hidden border border-zinc-800 text-xs">
              {(["power", "rarity", "date"] as SortMode[]).map((m) => (
                <button key={m} onClick={() => setSortMode(m)}
                  className={`px-2.5 py-1.5 font-medium capitalize transition-all
                    ${sortMode === m ? "bg-zinc-700 text-white" : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"}`}>
                  {m === "power" ? "⚡ Power" : m === "rarity" ? "💎 Rarity" : "🕐 Date"}
                </button>
              ))}
            </div>
          </div>
          {/* Hint */}
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-zinc-500">
            Win battles → earn <span className="text-amber-300 font-semibold">🪨 {SHARD_WIN_MIN}–{SHARD_WIN_MAX} shards</span> for Deluxe pulls
          </div>
        </div>

        {/* Scrollable card grid */}
        <div className="flex-1 overflow-y-auto pr-1 min-h-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-3">
            {sorted.map((c) => (
              <button key={c.id} onClick={() => setPlayerCard(playerCard?.id === c.id ? null : c)}
                className={`rounded-xl border-2 transition-all p-2 flex flex-col items-center gap-1.5 bg-zinc-900
                  ${playerCard?.id === c.id
                    ? (RARITY_BORDER[c.rarity] ?? "border-zinc-700") + " scale-105 " + (RARITY_GLOW[c.rarity] ?? "")
                    : "border-zinc-800 hover:border-zinc-600"}`}>
                <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-zinc-800">
                  <Image src={c.image} alt={c.name} fill sizes="100px" style={{ objectFit: "cover" }} />
                </div>
                <p className="text-xs font-semibold text-center w-full truncate">{c.name}</p>
                <StarRow count={c.stars} />
                <p className="text-xs text-zinc-500">{cardPowerScore(c)} pwr</p>
              </button>
            ))}
          </div>
        </div>

        {/* Battle button — fixed at bottom */}
        <div className="shrink-0 pt-3 border-t border-zinc-800">
          <button onClick={startBattle} disabled={!playerCard}
            className={`w-full py-3 rounded-xl font-semibold text-sm transition-all
              ${playerCard ? "bg-red-600 text-white hover:bg-red-500 active:scale-95" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}>
            {playerCard ? `Battle with ${playerCard.name}` : "Select a card to battle"}
          </button>
        </div>
      </div>
    );
  }

  // ── Fighting Phase ─────────────────────────────────────────────────────
  if (phase === "fighting" && player && enemy) {
    const moveKeys: MoveKey[] = ["basic", "special", "defense", "ultimate"];

    return (
      <div className="flex flex-col gap-3" style={{ height: "calc(100vh - 200px)" }}>
        {/* Combatants row */}
        <div className="flex gap-3 shrink-0">
          <CombatantCard c={player} side="player" />
          <div className="flex items-center justify-center text-xl font-black text-red-500 shrink-0">VS</div>
          <CombatantCard c={enemy} side="enemy" />
        </div>

        {/* Battle log */}
        <div ref={logRef} className="flex-1 overflow-y-auto rounded-xl bg-zinc-900 border border-zinc-800 p-3 space-y-1 min-h-0">
          {log.map((entry, i) => (
            <p key={i} className={`text-xs font-mono ${
              entry.kind === "player"  ? "text-blue-300" :
              entry.kind === "enemy"   ? "text-red-300"  :
              entry.kind === "effect"  ? "text-amber-300" :
              "text-zinc-500"
            }`}>{entry.text}</p>
          ))}
          {enemyThinking && <p className="text-xs text-zinc-600 italic animate-pulse">Enemy is thinking…</p>}
        </div>

        {/* Move buttons or result */}
        <div className="shrink-0 space-y-2">
          {battleOver ? (
            <div className="space-y-2">
              <div className={`rounded-xl border-2 p-3 text-center ${battleOver === "player" ? "border-green-600 bg-green-950/30" : "border-red-700 bg-red-950/20"}`}>
                <p className="font-black text-lg">{battleOver === "player" ? "🏆 Victory!" : "💀 Defeated"}</p>
                <p className="text-sm text-amber-300 font-semibold">+{pendingShards} 🪨 shards</p>
                {pendingDrops.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                    {pendingDrops.map((item) => (
                      <span key={item.id} className={`text-xs px-2 py-0.5 rounded-full border ${ITEM_RARITY_BORDER[item.rarity]} ${ITEM_RARITY_STYLE[item.rarity]}`}>
                        {item.icon} {item.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={claimAndReset}
                className="w-full py-2.5 rounded-xl font-semibold text-sm bg-white text-black hover:bg-zinc-200 active:scale-95 transition-all">
                Claim & battle again
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs text-zinc-500 text-center">
                {isPlayerTurn ? "Your turn — pick a move" : "Enemy's turn…"}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {moveKeys.map((mk) => {
                  const move     = player.def.moves[mk];
                  const cost     = moveCost(mk, player);
                  const canAfford = player.mana >= cost;
                  const disabled  = !isPlayerTurn || !!battleOver || !canAfford || enemyThinking;
                  return (
                    <button key={mk} onClick={() => executeMove(mk)} disabled={disabled}
                      className={`rounded-xl border-2 p-2.5 text-left transition-all
                        ${disabled
                          ? "border-zinc-800 bg-zinc-900 opacity-40 cursor-not-allowed"
                          : isPlayerTurn ? MOVE_COLORS[mk] + " active:scale-95" : MOVE_COLORS[mk]
                        }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold">{MOVE_ICONS[mk]} {move.name}</span>
                        {cost > 0 && <span className="text-xs text-blue-400">{cost}MP</span>}
                      </div>
                      <p className="text-xs text-zinc-400 leading-tight line-clamp-2">{move.effectText}</p>
                      {move.power > 0 && (
                        <p className="text-xs text-zinc-500 mt-1">PWR {move.power}</p>
                      )}
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
  const merged = Object.values(
    items.reduce<Record<string, Item>>((acc, item) => {
      if (acc[item.name]) acc[item.name] = { ...acc[item.name], quantity: acc[item.name].quantity + 1 };
      else acc[item.name] = { ...item };
      return acc;
    }, {})
  ).sort((a, b) => {
    const order: ItemRarity[] = ["Legendary", "Epic", "Rare", "Uncommon", "Common"];
    return order.indexOf(a.rarity) - order.indexOf(b.rarity);
  });

  return (
    <div className="w-full space-y-4">
      <div className="rounded-xl bg-zinc-900 border border-amber-800/60 p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-300">Brainrot Shards</p>
          <p className="text-xs text-zinc-500 mt-0.5">Earn by battling · spend on Deluxe pulls</p>
        </div>
        <ShardBadge shards={shards} />
      </div>
      {merged.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-zinc-600">
          <span style={{ fontSize: 48 }}>🎒</span>
          <p className="text-sm">No items yet — win battles to earn drops</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-zinc-500">{items.length} item{items.length !== 1 ? "s" : ""} collected</p>
          {merged.map((item) => (
            <div key={item.name} className={`flex items-center gap-4 rounded-xl border bg-zinc-900 p-3 ${ITEM_RARITY_BORDER[item.rarity]}`}>
              <span style={{ fontSize: 28 }}>{item.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">{item.name}</p>
                  {item.quantity > 1 && <span className="text-xs bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded-full">×{item.quantity}</span>}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">{item.description}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${ITEM_RARITY_STYLE[item.rarity]}`}>{item.rarity}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ── Refinery Tab ───────────────────────────────────────────────────────────
function RefineryTab({ collection, onUpgrade }: {
  collection: OwnedCard[];
  onUpgrade: (targetId: string, sacrificeIds: string[]) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected   = collection.find((c) => c.id === selectedId) ?? null;
  const fuelCards  = selected ? collection.filter((c) => c.name === selected.name && c.id !== selectedId) : [];
  const canUpgrade = selected && fuelCards.length >= UPGRADE_COST && selected.stars < 5;

  const groups = Object.entries(
    collection.reduce<Record<string, OwnedCard[]>>((acc, c) => { (acc[c.name] = acc[c.name] ?? []).push(c); return acc; }, {})
  );

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-zinc-600">
        <span style={{ fontSize: 48 }}>⚗️</span>
        <p className="text-sm">No cards to refine — pull some first</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-1">
        <p className="text-sm font-semibold">How it works</p>
        <p className="text-xs text-zinc-400">Sacrifice {UPGRADE_COST} duplicates of the same card to gain 1 ★. Max 5 ★.</p>
      </div>
      <div>
        <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wide">Select card to upgrade</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {groups.map(([name, arr]) => {
            const best = arr.reduce((a, b) => (a.stars >= b.stars ? a : b));
            const isSelected = selectedId === best.id;
            const dupeCount  = arr.filter((c) => c.id !== best.id).length;
            return (
              <button key={name} onClick={() => setSelectedId(isSelected ? null : best.id)}
                className={`rounded-xl border-2 bg-zinc-900 p-2 flex flex-col items-center gap-1.5 transition-all
                  ${isSelected
                    ? (RARITY_BORDER[best.rarity] ?? "border-zinc-700") + " scale-105 " + (RARITY_GLOW[best.rarity] ?? "")
                    : "border-zinc-800 hover:border-zinc-600"}`}>
                <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-zinc-800">
                  <Image src={best.image} alt={best.name} fill sizes="100px" style={{ objectFit: "cover" }} />
                </div>
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
            <div>
              <p className="font-semibold text-sm">{selected.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <StarRow count={selected.stars} />
                {selected.stars < 5 && <span className="text-zinc-500 text-xs">→ {selected.stars + 1} ★</span>}
              </div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${RARITY_STYLE[selected.rarity] ?? "bg-zinc-700 text-zinc-300"}`}>{selected.rarity}</span>
          </div>
          {selected.stars >= 5 ? (
            <p className="text-xs text-amber-400 font-medium">Max stars reached ✦</p>
          ) : (
            <>
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Duplicates available</span>
                <span className={fuelCards.length >= UPGRADE_COST ? "text-green-400" : "text-red-400"}>{fuelCards.length} / {UPGRADE_COST}</span>
              </div>
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${Math.min(100, (fuelCards.length / UPGRADE_COST) * 100)}%` }} />
              </div>
              <button onClick={() => { if (selected && canUpgrade) { onUpgrade(selected.id, fuelCards.slice(0, UPGRADE_COST).map((c) => c.id)); setSelectedId(null); } }}
                disabled={!canUpgrade}
                className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all
                  ${canUpgrade ? "bg-amber-500 text-black hover:bg-amber-400 active:scale-95" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}>
                {canUpgrade ? `Upgrade to ${selected.stars + 1} ★` : `Need ${UPGRADE_COST - fuelCards.length} more duplicate${UPGRADE_COST - fuelCards.length !== 1 ? "s" : ""}`}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function Home() {
  const [activeTab,   setActiveTab]   = useState<Tab>("packs");
  const [collection,  setCollection]  = useState<OwnedCard[]>([]);
  const [items,       setItems]       = useState<Item[]>([]);
  const [shards,      setShards]      = useState(0);
  const [regularPity, setRegularPity] = useState(0);

  useEffect(() => {
    const c = localStorage.getItem("collection");
    const i = localStorage.getItem("items");
    const s = localStorage.getItem("shards");
    const p = localStorage.getItem("regularPity");
    if (c) setCollection(JSON.parse(c));
    if (i) setItems(JSON.parse(i));
    if (s) setShards(Number(s));
    if (p) setRegularPity(Number(p));
  }, []);

  const saveCollection  = useCallback((c: OwnedCard[]) => { setCollection(c);  localStorage.setItem("collection",  JSON.stringify(c)); }, []);
  const saveItems       = useCallback((i: Item[])      => { setItems(i);        localStorage.setItem("items",       JSON.stringify(i)); }, []);
  const saveShards      = useCallback((n: number)      => { setShards(n);       localStorage.setItem("shards",      String(n)); }, []);
  const saveRegularPity = useCallback((n: number)      => { setRegularPity(n);  localStorage.setItem("regularPity", String(n)); }, []);

  function handleKeepCards(newCards: OwnedCard[]) { saveCollection([...collection, ...newCards]); }
  function handleSpendShards(n: number)           { saveShards(Math.max(0, shards - n)); }
  function handleBattleEnd(drops: Item[], earned: number) {
    saveItems([...items, ...drops]);
    saveShards(shards + earned);
  }
  function handleUpgrade(targetId: string, sacrificeIds: string[]) {
    saveCollection(
      collection
        .filter((c) => !sacrificeIds.includes(c.id))
        .map((c) => c.id === targetId ? { ...c, stars: Math.min(5, c.stars + 1) } : c)
    );
  }

  const uniqueCards = new Set(collection.map((c) => c.name)).size;

  return (
    <div className="min-h-screen flex bg-zinc-950 text-white">
      <aside className="w-52 shrink-0 flex flex-col border-r border-zinc-800 bg-zinc-950 py-8 px-3 gap-2">
        <h1 className="text-base font-bold tracking-tight px-3 mb-4">🧠 Brainrot</h1>
        {NAV_ITEMS.map(({ tab, label, icon }) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left
              ${activeTab === tab ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"}`}>
            <span style={{ fontSize: 18 }}>{icon}</span>
            {label}
          </button>
        ))}
        <div className="mt-auto px-3 pt-4 border-t border-zinc-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-600">Shards</p>
            <ShardBadge shards={shards} />
          </div>
          <p className="text-xs text-zinc-600">Cards: <span className="text-zinc-400 font-medium">{collection.length}</span></p>
          <p className="text-xs text-zinc-600">Unique: <span className="text-zinc-400 font-medium">{uniqueCards}</span></p>
          <p className="text-xs text-zinc-600">Items: <span className="text-zinc-400 font-medium">{items.length}</span></p>
        </div>
      </aside>

      <main className="flex-1 flex flex-col p-8 overflow-hidden">
        <div className="w-full max-w-lg mx-auto flex flex-col h-full">
          <div className="mb-6 shrink-0">
            <h2 className="text-2xl font-bold tracking-tight">
              {NAV_ITEMS.find((n) => n.tab === activeTab)?.label}
            </h2>
          </div>
          <div className={`flex-1 min-h-0 ${activeTab === "battle" ? "overflow-hidden" : "overflow-y-auto"}`}>
            {activeTab === "packs"      && <PacksTab shards={shards} regularPity={regularPity} onKeepCards={handleKeepCards} onSpendShards={handleSpendShards} onRegularPull={saveRegularPity} />}
            {activeTab === "collection" && <CollectionTab collection={collection} />}
            {activeTab === "battle"     && <BattleTab collection={collection} onBattleEnd={handleBattleEnd} />}
            {activeTab === "inventory"  && <InventoryTab items={items} shards={shards} />}
            {activeTab === "refinery"   && <RefineryTab collection={collection} onUpgrade={handleUpgrade} />}
          </div>
        </div>
      </main>
    </div>
  );
}