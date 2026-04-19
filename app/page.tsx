"use client";

import { useEffect, useState, useCallback } from "react";
import cards from "../data/brainrot.json";
import { generateStats, CardStats } from "../lib/stats";
import Image from "next/image";

// ── Types ──────────────────────────────────────────────────────────────────
type Card = { name: string; rarity: string; image: string };
type OwnedCard = Card & { stats: CardStats; id: string; stars: number };
type Tab = "draw" | "collection" | "inventory" | "refinery";

// ── Constants ──────────────────────────────────────────────────────────────
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

const COOLDOWN_MS = 0 * 60 * 1000;
const UPGRADE_COST = 10; // brainrot cards to upgrade 1 star

const NAV_ITEMS: { tab: Tab; label: string; icon: string }[] = [
  { tab: "draw",       label: "Draw Card",  icon: "🃏" },
  { tab: "collection", label: "Collection", icon: "📖" },
  { tab: "inventory",  label: "Inventory",  icon: "🎒" },
  { tab: "refinery",   label: "Refinery",   icon: "⚗️" },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function formatTime(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function StarRow({ count, max = 5 }: { count: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={`text-xs ${i < count ? "text-amber-400" : "text-zinc-700"}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────
function CardDisplay({
  card,
  stars,
  flipping,
  stats,
}: {
  card: OwnedCard | null;
  stars?: number;
  flipping: boolean;
  stats: CardStats | null;
}) {
  return (
    <div
      className={`w-64 rounded-2xl border-2 bg-zinc-900 p-5 flex flex-col items-center gap-4 transition-all duration-300
        ${card ? RARITY_BORDER[card.rarity] ?? "border-zinc-700" : "border-zinc-800"}
        ${card ? RARITY_GLOW[card.rarity] ?? "" : ""}
        ${flipping ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}
    >
      {card ? (
        <>
          <div className="relative w-44 h-44 rounded-xl overflow-hidden bg-zinc-800">
            <Image
              src={card.image}
              alt={card.name}
              fill
              sizes="176px"
              style={{ objectFit: "cover" }}
            />
          </div>

          <div className="flex flex-col items-center gap-1 w-full">
            <span
              className={`text-xs px-3 py-0.5 rounded-full font-medium ${
                RARITY_STYLE[card.rarity] ?? "bg-zinc-700 text-zinc-300"
              }`}
            >
              {card.rarity}
            </span>
            <p className="font-semibold text-center text-base mt-1">{card.name}</p>
            {stars !== undefined && <StarRow count={stars} />}
          </div>

          {stats && (
            <div className="w-full space-y-2">
              {STATS_CONFIG.map(({ key, label, color }) => (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-400">{label}</span>
                    <span className="font-medium">{stats[key]}</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color} rounded-full transition-all duration-700`}
                      style={{ width: `${stats[key]}%` }}
                    />
                  </div>
                </div>
              ))}
              <p className="text-zinc-500 italic text-xs pt-3 border-t border-white/10 text-center">
                {stats.ability}
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 py-10 text-zinc-600">
          <span style={{ fontSize: 48 }}>🃏</span>
          <p className="text-sm">Hit draw to summon a card</p>
        </div>
      )}
    </div>
  );
}

// ── Tabs ───────────────────────────────────────────────────────────────────
function DrawTab({
  inventory,
  onDraw,
}: {
  inventory: OwnedCard[];
  onDraw: (card: OwnedCard) => void;
}) {
  const [card, setCard] = useState<OwnedCard | null>(null);
  const [stats, setStats] = useState<CardStats | null>(null);
  const [flipping, setFlipping] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [justDrawn, setJustDrawn] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("cooldownUntil");
    if (saved) {
      const until = Number(saved);
      if (until > Date.now()) setCooldownUntil(until);
      else localStorage.removeItem("cooldownUntil");
    }
  }, []);

  useEffect(() => {
    if (!cooldownUntil) return;
    const interval = setInterval(() => {
      const remaining = cooldownUntil - Date.now();
      if (remaining <= 0) {
        setCooldownUntil(null);
        setTimeLeft(0);
        localStorage.removeItem("cooldownUntil");
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownUntil]);

  function draw() {
    if (cooldownUntil && cooldownUntil > Date.now()) return;
    setFlipping(true);
    setJustDrawn(false);
    setTimeout(() => {
      const picked = cards[Math.floor(Math.random() * cards.length)] as Card;
      const s = generateStats(picked.name, picked.rarity);
      const newCard: OwnedCard = { ...picked, stats: s, id: uid(), stars: 1 };
      setCard(newCard);
      setStats(s);
      setFlipping(false);
      setJustDrawn(true);
      const until = Date.now() + COOLDOWN_MS;
      setCooldownUntil(until);
      localStorage.setItem("cooldownUntil", until.toString());
    }, 300);
  }

  const isCooldown = cooldownUntil !== null && cooldownUntil > Date.now();

  function handleKeep() {
    if (!card) return;
    onDraw(card);
    setJustDrawn(false);
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <CardDisplay card={card} stars={card?.stars} flipping={flipping} stats={stats} />

      {isCooldown && (
        <p className="text-sm text-zinc-400">
          Cooldown: <span className="font-semibold">{formatTime(timeLeft)}</span>
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={draw}
          disabled={isCooldown}
          className={`px-8 py-3 rounded-xl font-semibold text-sm transition-all
            ${isCooldown
              ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
              : "bg-white text-black hover:bg-zinc-200 active:scale-95"
            }`}
        >
          {isCooldown ? `Wait ${formatTime(timeLeft)}` : card ? "Draw Again" : "Draw Card"}
        </button>

        {justDrawn && card && (
          <button
            onClick={handleKeep}
            className="px-6 py-3 rounded-xl font-semibold text-sm bg-amber-500 text-black hover:bg-amber-400 active:scale-95 transition-all"
          >
            Keep →
          </button>
        )}
      </div>

      {justDrawn && (
        <p className="text-xs text-zinc-500">Draw again to discard, or keep to add to inventory</p>
      )}

      <p className="text-xs text-zinc-600">
        {inventory.length} card{inventory.length !== 1 ? "s" : ""} in inventory
      </p>
    </div>
  );
}

function CollectionTab({ inventory }: { inventory: OwnedCard[] }) {
  const unique = Object.values(
    inventory.reduce<Record<string, OwnedCard>>((acc, c) => {
      if (!acc[c.name] || c.stars > acc[c.name].stars) acc[c.name] = c;
      return acc;
    }, {})
  );

  if (unique.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-zinc-600">
        <span style={{ fontSize: 48 }}>📖</span>
        <p className="text-sm">No cards collected yet — go draw some!</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <p className="text-sm text-zinc-500 mb-4">
        {unique.length} unique card{unique.length !== 1 ? "s" : ""} discovered
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {unique.map((c) => (
          <div
            key={c.name}
            className={`rounded-xl border-2 bg-zinc-900 p-3 flex flex-col items-center gap-2 ${RARITY_BORDER[c.rarity] ?? "border-zinc-700"} ${RARITY_GLOW[c.rarity] ?? ""}`}
          >
            <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-zinc-800">
              <Image src={c.image} alt={c.name} fill sizes="150px" style={{ objectFit: "cover" }} />
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RARITY_STYLE[c.rarity] ?? "bg-zinc-700 text-zinc-300"}`}>
              {c.rarity}
            </span>
            <p className="text-xs font-semibold text-center leading-tight">{c.name}</p>
            <StarRow count={c.stars} />
          </div>
        ))}
      </div>
    </div>
  );
}

function InventoryTab({
  inventory,
  onRemove,
}: {
  inventory: OwnedCard[];
  onRemove: (id: string) => void;
}) {
  if (inventory.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-zinc-600">
        <span style={{ fontSize: 48 }}>🎒</span>
        <p className="text-sm">Your inventory is empty</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      <p className="text-sm text-zinc-500 mb-4">
        {inventory.length} card{inventory.length !== 1 ? "s" : ""} owned
      </p>
      {inventory.map((c) => (
        <div
          key={c.id}
          className={`flex items-center gap-3 rounded-xl border bg-zinc-900 p-3 ${RARITY_BORDER[c.rarity] ?? "border-zinc-800"}`}
        >
          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
            <Image src={c.image} alt={c.name} fill sizes="48px" style={{ objectFit: "cover" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{c.name}</p>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${RARITY_STYLE[c.rarity] ?? "bg-zinc-700 text-zinc-300"}`}>
                {c.rarity}
              </span>
              <StarRow count={c.stars} />
            </div>
          </div>
          <button
            onClick={() => onRemove(c.id)}
            className="text-xs text-zinc-600 hover:text-red-400 transition-colors px-2 py-1"
            title="Discard"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

function RefineryTab({
  inventory,
  onUpgrade,
}: {
  inventory: OwnedCard[];
  onUpgrade: (targetId: string, sacrificeIds: string[]) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = inventory.find((c) => c.id === selectedId) ?? null;

  // Cards of the same name that aren't the selected one, to use as fuel
  const fuelCards = selected
    ? inventory.filter((c) => c.name === selected.name && c.id !== selectedId)
    : [];

  const canUpgrade = selected && fuelCards.length >= UPGRADE_COST && selected.stars < 5;

  function handleUpgrade() {
    if (!selected || !canUpgrade) return;
    const sacrificeIds = fuelCards.slice(0, UPGRADE_COST).map((c) => c.id);
    onUpgrade(selected.id, sacrificeIds);
    setSelectedId(null);
  }

  // Group by card name for selection UI
  const groups = Object.entries(
    inventory.reduce<Record<string, OwnedCard[]>>((acc, c) => {
      (acc[c.name] = acc[c.name] ?? []).push(c);
      return acc;
    }, {})
  ).filter(([, arr]) => arr.length > 0);

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-zinc-600">
        <span style={{ fontSize: 48 }}>⚗️</span>
        <p className="text-sm">No cards to refine — collect some first</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-1">
        <p className="text-sm font-semibold">How it works</p>
        <p className="text-xs text-zinc-400">
          Select a card to upgrade, then sacrifice {UPGRADE_COST} duplicates of the same card to gain 1 ★. Max 5 ★.
        </p>
      </div>

      {/* Card selection */}
      <div>
        <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wide">Select card to upgrade</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {groups.map(([name, arr]) => {
            const best = arr.reduce((a, b) => (a.stars >= b.stars ? a : b));
            const isSelected = selectedId === best.id;
            const dupeCount = arr.filter((c) => c.id !== best.id).length;
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
                  <Image src={best.image} alt={best.name} fill sizes="120px" style={{ objectFit: "cover" }} />
                </div>
                <p className="text-xs font-semibold text-center leading-tight truncate w-full">{name}</p>
                <StarRow count={best.stars} />
                <p className="text-xs text-zinc-500">{dupeCount} dupe{dupeCount !== 1 ? "s" : ""}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Upgrade panel */}
      {selected && (
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">{selected.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <StarRow count={selected.stars} />
                {selected.stars < 5 && (
                  <span className="text-zinc-500 text-xs">→ {selected.stars + 1} ★</span>
                )}
              </div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${RARITY_STYLE[selected.rarity] ?? "bg-zinc-700 text-zinc-300"}`}>
              {selected.rarity}
            </span>
          </div>

          {selected.stars >= 5 ? (
            <p className="text-xs text-amber-400 font-medium">Max stars reached ✦</p>
          ) : (
            <>
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Duplicates available</span>
                <span className={fuelCards.length >= UPGRADE_COST ? "text-green-400" : "text-red-400"}>
                  {fuelCards.length} / {UPGRADE_COST}
                </span>
              </div>
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (fuelCards.length / UPGRADE_COST) * 100)}%` }}
                />
              </div>
              <button
                onClick={handleUpgrade}
                disabled={!canUpgrade}
                className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all
                  ${canUpgrade
                    ? "bg-amber-500 text-black hover:bg-amber-400 active:scale-95"
                    : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                  }`}
              >
                {canUpgrade
                  ? `Upgrade to ${selected.stars + 1} ★ (costs ${UPGRADE_COST} dupes)`
                  : `Need ${UPGRADE_COST - fuelCards.length} more duplicate${UPGRADE_COST - fuelCards.length !== 1 ? "s" : ""}`}
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
  const [activeTab, setActiveTab] = useState<Tab>("draw");
  const [inventory, setInventory] = useState<OwnedCard[]>([]);

  // Persist inventory
  useEffect(() => {
    const saved = localStorage.getItem("inventory");
    if (saved) setInventory(JSON.parse(saved));
  }, []);

  const saveInventory = useCallback((inv: OwnedCard[]) => {
    setInventory(inv);
    localStorage.setItem("inventory", JSON.stringify(inv));
  }, []);

  function handleDraw(card: OwnedCard) {
    saveInventory([...inventory, card]);
  }

  function handleRemove(id: string) {
    saveInventory(inventory.filter((c) => c.id !== id));
  }

  function handleUpgrade(targetId: string, sacrificeIds: string[]) {
    const next = inventory
      .filter((c) => !sacrificeIds.includes(c.id))
      .map((c) => (c.id === targetId ? { ...c, stars: Math.min(5, c.stars + 1) } : c));
    saveInventory(next);
  }

  return (
    <div className="min-h-screen flex bg-zinc-950 text-white">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 flex flex-col border-r border-zinc-800 bg-zinc-950 py-8 px-3 gap-2">
        <h1 className="text-base font-bold tracking-tight px-3 mb-4">
          🧠 Brainrot
        </h1>
        {NAV_ITEMS.map(({ tab, label, icon }) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left
              ${activeTab === tab
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              }`}
          >
            <span style={{ fontSize: 18 }}>{icon}</span>
            {label}
          </button>
        ))}

        {/* Inventory count badge */}
        <div className="mt-auto px-3 pt-4 border-t border-zinc-800">
          <p className="text-xs text-zinc-600">
            Inventory:{" "}
            <span className="text-zinc-400 font-medium">{inventory.length}</span>
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-start p-10 overflow-y-auto">
        <div className="w-full max-w-lg">
          {/* Tab heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight">
              {NAV_ITEMS.find((n) => n.tab === activeTab)?.label}
            </h2>
          </div>

          {activeTab === "draw" && (
            <DrawTab inventory={inventory} onDraw={handleDraw} />
          )}
          {activeTab === "collection" && (
            <CollectionTab inventory={inventory} />
          )}
          {activeTab === "inventory" && (
            <InventoryTab inventory={inventory} onRemove={handleRemove} />
          )}
          {activeTab === "refinery" && (
            <RefineryTab inventory={inventory} onUpgrade={handleUpgrade} />
          )}
        </div>
      </main>
    </div>
  );
}