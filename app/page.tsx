"use client";

import { useEffect, useState, useCallback } from "react";
import cards from "../data/brainrot.json";
import { generateStats, CardStats } from "../lib/stats";
import Image from "next/image";

// ── Types ──────────────────────────────────────────────────────────────────
type Card = { name: string; rarity: string; image: string };
type OwnedCard = Card & { stats: CardStats; id: string; stars: number };
type Tab = "packs" | "collection" | "battle" | "inventory" | "refinery";
type BannerType = "regular" | "deluxe";

type ItemRarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";
type Item = {
  id: string;
  name: string;
  icon: string;
  rarity: ItemRarity;
  description: string;
  quantity: number;
};

type BattleResult = {
  winner: "player" | "enemy";
  drops: Item[];
  shardsEarned: number;
  log: string[];
};

// ── Pull Rates ─────────────────────────────────────────────────────────────
// Regular banner — low Epic/Legendary odds, pity at 500
const REGULAR_RATES = { Common: 70, Rare: 24.7, Epic: 4.5, Legendary: 0.8 };
const REGULAR_PITY = 500;

// Deluxe banner — higher odds, costs Brainrot Shards
const DELUXE_RATES  = { Common: 55, Rare: 30,   Epic: 11,  Legendary: 4   };
const DELUXE_1_COST  = 100;   // shards per single pull
const DELUXE_10_COST = 1000;  // shards per 10-pull

// Battle shard reward range
const SHARD_WIN_MIN  = 20;
const SHARD_WIN_MAX  = 25;
const SHARD_LOSS     = 5;     // small consolation

// ── Item Pool ──────────────────────────────────────────────────────────────
const ITEM_POOL: Omit<Item, "id" | "quantity">[] = [
  { name: "Sigma Stone",        icon: "💎", rarity: "Legendary", description: "Crystallized sigma energy. Very rare." },
  { name: "Rizz Elixir",        icon: "🧪", rarity: "Epic",      description: "Bottled rizz. Smells expensive." },
  { name: "Brainrot Shard",     icon: "🪨", rarity: "Rare",      description: "A fragment of pure brainrot." },
  { name: "NPC Dust",           icon: "✨", rarity: "Uncommon",  description: "Swept from defeated NPCs." },
  { name: "Skibidi Token",      icon: "🪙", rarity: "Common",    description: "Minted from toilet vibes." },
  { name: "Aura Fragment",      icon: "🌀", rarity: "Rare",      description: "A piece of someone's lost aura." },
  { name: "Gyatt Gem",          icon: "💜", rarity: "Epic",      description: "Don't ask where this came from." },
  { name: "Mewing Scroll",      icon: "📜", rarity: "Uncommon",  description: "Ancient mewing techniques." },
  { name: "Fanum Tax Receipt",  icon: "🧾", rarity: "Common",    description: "Proof of food confiscation." },
  { name: "W Key",              icon: "🗝️", rarity: "Legendary", description: "The rarest key. Only winners hold it." },
];

const ITEM_RARITY_WEIGHTS: Record<ItemRarity, number> = {
  Common: 50, Uncommon: 25, Rare: 15, Epic: 8, Legendary: 2,
};

const ITEM_RARITY_STYLE: Record<ItemRarity, string> = {
  Common:    "bg-zinc-700 text-zinc-200",
  Uncommon:  "bg-green-900 text-green-200",
  Rare:      "bg-blue-900 text-blue-200",
  Epic:      "bg-purple-900 text-purple-200",
  Legendary: "bg-amber-900 text-amber-200",
};

const ITEM_RARITY_BORDER: Record<ItemRarity, string> = {
  Common:    "border-zinc-700",
  Uncommon:  "border-green-700",
  Rare:      "border-blue-700",
  Epic:      "border-purple-600",
  Legendary: "border-amber-500",
};

// ── Card Style Maps ────────────────────────────────────────────────────────
const RARITY_STYLE: Record<string, string> = {
  Common:    "bg-zinc-700 text-zinc-200",
  Rare:      "bg-blue-900 text-blue-200",
  Epic:      "bg-purple-900 text-purple-200",
  Legendary: "bg-amber-900 text-amber-200",
};
const RARITY_BORDER: Record<string, string> = {
  Common:    "border-zinc-700",
  Rare:      "border-blue-700",
  Epic:      "border-purple-600",
  Legendary: "border-amber-500",
};
const RARITY_GLOW: Record<string, string> = {
  Common:    "",
  Rare:      "shadow-[0_0_18px_2px_rgba(59,130,246,0.25)]",
  Epic:      "shadow-[0_0_18px_2px_rgba(168,85,247,0.3)]",
  Legendary: "shadow-[0_0_24px_4px_rgba(251,191,36,0.35)]",
};

const STATS_CONFIG = [
  { key: "brainrotPower", label: "Brainrot Power", color: "bg-red-500" },
  { key: "rizz",          label: "Rizz",            color: "bg-pink-500" },
  { key: "sigmaAura",     label: "Sigma Aura",      color: "bg-purple-500" },
  { key: "npcEnergy",     label: "NPC Energy",      color: "bg-blue-500" },
] as const;

const UPGRADE_COST = 10;
const COOLDOWN_MS  = 60 * 1000; // 1 minute

const NAV_ITEMS: { tab: Tab; label: string; icon: string }[] = [
  { tab: "packs",      label: "Packs",      icon: "📦" },
  { tab: "collection", label: "Collection", icon: "📖" },
  { tab: "battle",     label: "Battle",     icon: "⚔️"  },
  { tab: "inventory",  label: "Inventory",  icon: "🎒"  },
  { tab: "refinery",   label: "Refinery",   icon: "⚗️"  },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function formatTime(ms: number) {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Roll a single card rarity given a rate table. Forces pity rarity if pityForced is set. */
function rollRarity(
  rates: Record<string, number>,
  pityCount: number,
  pityThreshold: number,
): string {
  if (pityCount >= pityThreshold - 1) return "Epic"; // pity guarantee: at least Epic

  const total = Object.values(rates).reduce((a, b) => a + b, 0);
  let roll   = Math.random() * total;
  for (const [r, w] of Object.entries(rates)) {
    roll -= w;
    if (roll <= 0) return r;
  }
  return "Common";
}

function pickCard(rarity: string): Card {
  const pool = (cards as Card[]).filter((c) => c.rarity === rarity);
  const src  = pool.length > 0 ? pool : (cards as Card[]);
  return src[Math.floor(Math.random() * src.length)];
}

function makeOwned(c: Card): OwnedCard {
  return { ...c, stats: generateStats(c.name, c.rarity), id: uid(), stars: 1 };
}

function weightedRandomItem(): Omit<Item, "id" | "quantity"> {
  const byRarity: Record<ItemRarity, typeof ITEM_POOL> = {
    Common: [], Uncommon: [], Rare: [], Epic: [], Legendary: [],
  };
  ITEM_POOL.forEach((i) => byRarity[i.rarity].push(i));
  const total = Object.values(ITEM_RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (const r of ["Common", "Uncommon", "Rare", "Epic", "Legendary"] as ItemRarity[]) {
    roll -= ITEM_RARITY_WEIGHTS[r];
    if (roll <= 0) {
      const choices = byRarity[r];
      return choices[Math.floor(Math.random() * choices.length)];
    }
  }
  return ITEM_POOL[0];
}

function rollDrops(count: number): Item[] {
  return Array.from({ length: count }, () => ({
    ...weightedRandomItem(), id: uid(), quantity: 1,
  }));
}

function cardPower(c: OwnedCard): number {
  const s = c.stats;
  return Math.round((s.brainrotPower + s.rizz + s.sigmaAura + s.npcEnergy) * (1 + (c.stars - 1) * 0.15));
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

// ── Reveal overlay for pulled cards ───────────────────────────────────────
function RevealGrid({
  drawnCards,
  revealed,
  kept,
  onToggle,
  onKeep,
  onDiscard,
}: {
  drawnCards: OwnedCard[];
  revealed: boolean[];
  kept: boolean[];
  onToggle: (i: number) => void;
  onKeep: () => void;
  onDiscard: () => void;
}) {
  const keptCount = kept.filter(Boolean).length;
  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-400 text-center">Tap cards to keep them</p>
      <div className={`grid gap-3 ${drawnCards.length <= 1 ? "grid-cols-1 max-w-[160px] mx-auto" : drawnCards.length <= 3 ? "grid-cols-3" : "grid-cols-5"}`}>
        {drawnCards.map((c, i) => (
          <button
            key={c.id}
            onClick={() => revealed[i] && onToggle(i)}
            className={`rounded-xl border-2 transition-all duration-300 overflow-hidden
              ${!revealed[i] ? "bg-zinc-800 border-zinc-700"
                : kept[i]
                  ? (RARITY_BORDER[c.rarity] ?? "border-zinc-700") + " " + (RARITY_GLOW[c.rarity] ?? "") + " scale-105"
                  : "border-zinc-700 bg-zinc-900 opacity-60"
              }`}
            style={{ aspectRatio: "3/4" }}
          >
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
        <button
          onClick={onKeep}
          disabled={keptCount === 0}
          className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all
            ${keptCount > 0 ? "bg-amber-500 text-black hover:bg-amber-400 active:scale-95" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}
        >
          Keep {keptCount > 0 ? `${keptCount} card${keptCount !== 1 ? "s" : ""}` : "selected"}
        </button>
        <button
          onClick={onDiscard}
          className="px-4 py-3 rounded-xl text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-600 transition-all"
        >
          Discard all
        </button>
      </div>
    </div>
  );
}

// ── Packs Tab ──────────────────────────────────────────────────────────────
function PacksTab({
  shards,
  regularPity,
  onKeepCards,
  onSpendShards,
  onRegularPull,
}: {
  shards: number;
  regularPity: number;
  onKeepCards: (c: OwnedCard[]) => void;
  onSpendShards: (n: number) => void;
  onRegularPull: (newPity: number) => void;
}) {
  const [banner, setBanner] = useState<BannerType>("regular");
  const [phase, setPhase]   = useState<"select" | "reveal">("select");
  const [drawnCards, setDrawnCards]   = useState<OwnedCard[]>([]);
  const [revealed, setRevealed]       = useState<boolean[]>([]);
  const [kept, setKept]               = useState<boolean[]>([]);

  // Cooldown state (regular only)
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
    setDrawnCards(result);
    setRevealed(Array(result.length).fill(false));
    setKept(Array(result.length).fill(false));
    setPhase("reveal");
    result.forEach((_, i) => {
      setTimeout(() => {
        setRevealed((prev) => { const n = [...prev]; n[i] = true; return n; });
      }, i * 380 + 250);
    });
  }

  function pullRegular() {
    if (isCooldown) return;
    const newPity = regularPity + 1;
    const rarity  = rollRarity(REGULAR_RATES, newPity - 1, REGULAR_PITY);
    const card    = makeOwned(pickCard(rarity));
    onRegularPull(newPity >= REGULAR_PITY ? 0 : newPity);
    const until = Date.now() + COOLDOWN_MS;
    setCooldownUntil(until);
    localStorage.setItem("regularCooldown", String(until));
    reveal([card]);
  }

  function pullDeluxe(count: 1 | 10) {
    const cost = count === 1 ? DELUXE_1_COST : DELUXE_10_COST;
    if (shards < cost) return;
    onSpendShards(cost);
    const result: OwnedCard[] = [];
    for (let i = 0; i < count; i++) {
      const rarity = rollRarity(DELUXE_RATES, 0, 9999); // no separate pity for deluxe
      result.push(makeOwned(pickCard(rarity)));
    }
    reveal(result);
  }

  function handleToggle(i: number) {
    setKept((prev) => { const n = [...prev]; n[i] = !n[i]; return n; });
  }

  function handleKeep() {
    const toKeep = drawnCards.filter((_, i) => kept[i]);
    if (toKeep.length > 0) onKeepCards(toKeep);
    setPhase("select");
  }

  if (phase === "reveal") {
    return (
      <RevealGrid
        drawnCards={drawnCards}
        revealed={revealed}
        kept={kept}
        onToggle={handleToggle}
        onKeep={handleKeep}
        onDiscard={() => setPhase("select")}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner toggle */}
      <div className="flex rounded-xl overflow-hidden border border-zinc-800">
        <button
          onClick={() => setBanner("regular")}
          className={`flex-1 py-2.5 text-sm font-semibold transition-all
            ${banner === "regular" ? "bg-zinc-700 text-white" : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"}`}
        >
          🃏 Regular
        </button>
        <button
          onClick={() => setBanner("deluxe")}
          className={`flex-1 py-2.5 text-sm font-semibold transition-all
            ${banner === "deluxe" ? "bg-amber-600 text-black" : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"}`}
        >
          ✨ Deluxe
        </button>
      </div>

      {banner === "regular" ? (
        <div className="space-y-4">
          {/* Rate card */}
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
                <div
                  className="h-full bg-purple-500 rounded-full transition-all"
                  style={{ width: `${(regularPity / REGULAR_PITY) * 100}%` }}
                />
              </div>
              <p className="text-xs text-zinc-600 mt-1">Guaranteed Epic at {REGULAR_PITY} pulls</p>
            </div>
          </div>

          <button
            onClick={pullRegular}
            disabled={isCooldown}
            className={`w-full py-3 rounded-xl font-semibold text-sm transition-all
              ${isCooldown ? "bg-zinc-700 text-zinc-400 cursor-not-allowed" : "bg-white text-black hover:bg-zinc-200 active:scale-95"}`}
          >
            {isCooldown ? `Next pull in ${formatTime(timeLeft)}` : "Pull (Free)"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Deluxe rate card */}
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
              Earn 🪨 Brainrot Shards by winning battles ({SHARD_WIN_MIN}–{SHARD_WIN_MAX} per win). Top-up coming soon.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => pullDeluxe(1)}
              disabled={shards < DELUXE_1_COST}
              className={`py-3 rounded-xl font-semibold text-sm transition-all flex flex-col items-center gap-0.5
                ${shards >= DELUXE_1_COST ? "bg-amber-600 text-black hover:bg-amber-500 active:scale-95" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}
            >
              <span>1 Pull</span>
              <span className="text-xs font-normal opacity-80">🪨 {DELUXE_1_COST}</span>
            </button>
            <button
              onClick={() => pullDeluxe(10)}
              disabled={shards < DELUXE_10_COST}
              className={`py-3 rounded-xl font-semibold text-sm transition-all flex flex-col items-center gap-0.5
                ${shards >= DELUXE_10_COST ? "bg-amber-500 text-black hover:bg-amber-400 active:scale-95" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}
            >
              <span>10 Pull</span>
              <span className="text-xs font-normal opacity-80">🪨 {DELUXE_10_COST}</span>
            </button>
          </div>

          {shards < DELUXE_1_COST && (
            <p className="text-xs text-zinc-500 text-center">
              You need {DELUXE_1_COST - shards} more shards. Win battles to earn them!
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Collection ─────────────────────────────────────────────────────────────
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
      <p className="text-sm text-zinc-500 mb-4">{unique.length} unique card{unique.length !== 1 ? "s" : ""} discovered</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {unique.map((c) => <MiniCard key={c.name} c={c} />)}
      </div>
    </div>
  );
}

// ── Battle ─────────────────────────────────────────────────────────────────
function BattleTab({
  collection,
  onBattleEnd,
}: {
  collection: OwnedCard[];
  onBattleEnd: (drops: Item[], shards: number) => void;
}) {
  const [playerCard, setPlayerCard] = useState<OwnedCard | null>(null);
  const [enemyCard, setEnemyCard]   = useState<OwnedCard | null>(null);
  const [result, setResult]         = useState<BattleResult | null>(null);
  const [phase, setPhase]           = useState<"select" | "fighting" | "result">("select");

  function startBattle() {
    if (!playerCard) return;
    const enemyBase  = (cards as Card[])[Math.floor(Math.random() * cards.length)];
    const enemy: OwnedCard = makeOwned(enemyBase);
    enemy.stars = Math.ceil(Math.random() * 3);
    setEnemyCard(enemy);
    setPhase("fighting");

    setTimeout(() => {
      const pPow = cardPower(playerCard);
      const ePow = cardPower(enemy);
      const win  = pPow >= ePow;

      const log: string[] = [`${playerCard.name} (${pPow} pwr) vs ${enemy.name} (${ePow} pwr)`];
      STATS_CONFIG.forEach(({ key, label }) => {
        const ps = playerCard.stats[key], es = enemy.stats[key];
        log.push(ps > es ? `✓ ${label}: ${ps} vs ${es}` : ps < es ? `✗ ${label}: ${ps} vs ${es}` : `= ${label}: ${ps}`);
      });

      const dropCount  = win ? Math.floor(Math.random() * 3) + 2 : 1;
      const drops      = rollDrops(dropCount);
      const shards     = win
        ? Math.floor(Math.random() * (SHARD_WIN_MAX - SHARD_WIN_MIN + 1)) + SHARD_WIN_MIN
        : SHARD_LOSS;

      log.push(win
        ? `🏆 Victory! +${shards} 🪨 shards, ${drops.length} item drop${drops.length !== 1 ? "s" : ""}`
        : `💀 Defeat. +${shards} 🪨 shards consolation`
      );

      setResult({ winner: win ? "player" : "enemy", drops, shardsEarned: shards, log });
      setPhase("result");
    }, 1400);
  }

  function claimAndReset() {
    if (result) onBattleEnd(result.drops, result.shardsEarned);
    setResult(null); setEnemyCard(null); setPhase("select");
  }

  if (collection.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-zinc-600">
        <span style={{ fontSize: 48 }}>⚔️</span>
        <p className="text-sm">You need cards to battle — pull some first</p>
      </div>
    );
  }

  if (phase === "select") {
    return (
      <div className="space-y-6">
        <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wide">Choose your fighter</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {collection.map((c) => (
            <button
              key={c.id}
              onClick={() => setPlayerCard(playerCard?.id === c.id ? null : c)}
              className={`rounded-xl border-2 transition-all p-2 flex flex-col items-center gap-1.5 bg-zinc-900
                ${playerCard?.id === c.id
                  ? (RARITY_BORDER[c.rarity] ?? "border-zinc-700") + " scale-105 " + (RARITY_GLOW[c.rarity] ?? "")
                  : "border-zinc-800 hover:border-zinc-600"
                }`}
            >
              <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-zinc-800">
                <Image src={c.image} alt={c.name} fill sizes="100px" style={{ objectFit: "cover" }} />
              </div>
              <p className="text-xs font-semibold text-center w-full truncate">{c.name}</p>
              <StarRow count={c.stars} />
              <p className="text-xs text-zinc-500">{cardPower(c)} pwr</p>
            </button>
          ))}
        </div>
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-xs text-zinc-500">
          Win battles to earn <span className="text-amber-300 font-semibold">🪨 {SHARD_WIN_MIN}–{SHARD_WIN_MAX} Brainrot Shards</span> per victory. Use shards for Deluxe pulls.
        </div>
        <button
          onClick={startBattle}
          disabled={!playerCard}
          className={`w-full py-3 rounded-xl font-semibold text-sm transition-all
            ${playerCard ? "bg-red-600 text-white hover:bg-red-500 active:scale-95" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}
        >
          {playerCard ? `Battle with ${playerCard.name}` : "Select a card to battle"}
        </button>
      </div>
    );
  }

  if (phase === "fighting") {
    return (
      <div className="flex flex-col items-center gap-8 py-10">
        <div className="flex items-center gap-6">
          {playerCard && (
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-28 h-28 rounded-xl overflow-hidden border-2 border-white animate-pulse">
                <Image src={playerCard.image} alt={playerCard.name} fill sizes="112px" style={{ objectFit: "cover" }} />
              </div>
              <p className="text-xs font-semibold">{playerCard.name}</p>
            </div>
          )}
          <span className="text-3xl font-black text-red-500">VS</span>
          {enemyCard && (
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-28 h-28 rounded-xl overflow-hidden border-2 border-red-600 animate-pulse">
                <Image src={enemyCard.image} alt={enemyCard.name} fill sizes="112px" style={{ objectFit: "cover" }} />
              </div>
              <p className="text-xs font-semibold">{enemyCard.name}</p>
            </div>
          )}
        </div>
        <p className="text-zinc-400 text-sm animate-pulse">Battle in progress…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className={`rounded-2xl border-2 p-5 text-center ${result?.winner === "player" ? "border-green-600 bg-green-950/30" : "border-red-700 bg-red-950/20"}`}>
        <p className="text-2xl font-black mb-1">{result?.winner === "player" ? "🏆 Victory!" : "💀 Defeated"}</p>
        {result && (
          <p className="text-sm font-semibold mt-1">
            <span className="text-amber-300">+{result.shardsEarned} 🪨</span> Brainrot Shards earned
          </p>
        )}
        <div className="flex justify-center gap-6 mt-3">
          {playerCard && (
            <div className="flex flex-col items-center gap-1">
              <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                <Image src={playerCard.image} alt={playerCard.name} fill sizes="64px" style={{ objectFit: "cover" }} />
              </div>
              <p className="text-xs text-zinc-400">You — {cardPower(playerCard)} pwr</p>
            </div>
          )}
          <span className="text-xl font-black self-center text-zinc-500">vs</span>
          {enemyCard && (
            <div className="flex flex-col items-center gap-1">
              <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                <Image src={enemyCard.image} alt={enemyCard.name} fill sizes="64px" style={{ objectFit: "cover" }} />
              </div>
              <p className="text-xs text-zinc-400">Enemy — {cardPower(enemyCard)} pwr</p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-1">
        {result?.log.map((line, i) => (
          <p key={i} className="text-xs text-zinc-400 font-mono">{line}</p>
        ))}
      </div>

      {result && result.drops.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Item Drops</p>
          <div className="grid grid-cols-2 gap-2">
            {result.drops.map((item) => (
              <div key={item.id} className={`rounded-xl border bg-zinc-900 p-3 flex items-center gap-3 ${ITEM_RARITY_BORDER[item.rarity]}`}>
                <span style={{ fontSize: 24 }}>{item.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">{item.name}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${ITEM_RARITY_STYLE[item.rarity]}`}>{item.rarity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={claimAndReset} className="w-full py-3 rounded-xl font-semibold text-sm bg-white text-black hover:bg-zinc-200 active:scale-95 transition-all">
        Claim & battle again
      </button>
    </div>
  );
}

// ── Inventory ──────────────────────────────────────────────────────────────
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
      {/* Shard wallet */}
      <div className="rounded-xl bg-zinc-900 border border-amber-800/60 p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-300">Brainrot Shards</p>
          <p className="text-xs text-zinc-500 mt-0.5">Earn by winning battles · spend on Deluxe pulls</p>
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
                  {item.quantity > 1 && (
                    <span className="text-xs bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded-full">×{item.quantity}</span>
                  )}
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

// ── Refinery ───────────────────────────────────────────────────────────────
function RefineryTab({ collection, onUpgrade }: {
  collection: OwnedCard[];
  onUpgrade: (targetId: string, sacrificeIds: string[]) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected   = collection.find((c) => c.id === selectedId) ?? null;
  const fuelCards  = selected ? collection.filter((c) => c.name === selected.name && c.id !== selectedId) : [];
  const canUpgrade = selected && fuelCards.length >= UPGRADE_COST && selected.stars < 5;

  function handleUpgrade() {
    if (!selected || !canUpgrade) return;
    onUpgrade(selected.id, fuelCards.slice(0, UPGRADE_COST).map((c) => c.id));
    setSelectedId(null);
  }

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
        <p className="text-xs text-zinc-400">Sacrifice {UPGRADE_COST} duplicate cards of the same type to gain 1 ★. Max 5 ★.</p>
      </div>

      <div>
        <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wide">Select card to upgrade</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {groups.map(([name, arr]) => {
            const best = arr.reduce((a, b) => (a.stars >= b.stars ? a : b));
            const isSelected = selectedId === best.id;
            const dupeCount  = arr.filter((c) => c.id !== best.id).length;
            return (
              <button
                key={name}
                onClick={() => setSelectedId(isSelected ? null : best.id)}
                className={`rounded-xl border-2 bg-zinc-900 p-2 flex flex-col items-center gap-1.5 transition-all
                  ${isSelected
                    ? (RARITY_BORDER[best.rarity] ?? "border-zinc-700") + " scale-105 " + (RARITY_GLOW[best.rarity] ?? "")
                    : "border-zinc-800 hover:border-zinc-600"
                  }`}
              >
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
              <button
                onClick={handleUpgrade}
                disabled={!canUpgrade}
                className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all
                  ${canUpgrade ? "bg-amber-500 text-black hover:bg-amber-400 active:scale-95" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}
              >
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
  const [activeTab,    setActiveTab]    = useState<Tab>("packs");
  const [collection,   setCollection]   = useState<OwnedCard[]>([]);
  const [items,        setItems]        = useState<Item[]>([]);
  const [shards,       setShards]       = useState(0);
  const [regularPity,  setRegularPity]  = useState(0);

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
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left
              ${activeTab === tab ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"}`}
          >
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

      <main className="flex-1 flex flex-col items-center justify-start p-10 overflow-y-auto">
        <div className="w-full max-w-lg">
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight">
              {NAV_ITEMS.find((n) => n.tab === activeTab)?.label}
            </h2>
          </div>

          {activeTab === "packs"      && (
            <PacksTab
              shards={shards}
              regularPity={regularPity}
              onKeepCards={handleKeepCards}
              onSpendShards={handleSpendShards}
              onRegularPull={saveRegularPity}
            />
          )}
          {activeTab === "collection" && <CollectionTab collection={collection} />}
          {activeTab === "battle"     && <BattleTab collection={collection} onBattleEnd={handleBattleEnd} />}
          {activeTab === "inventory"  && <InventoryTab items={items} shards={shards} />}
          {activeTab === "refinery"   && <RefineryTab collection={collection} onUpgrade={handleUpgrade} />}
        </div>
      </main>
    </div>
  );
}