import { OwnedCard, Item, ItemRarity } from "./types";
import cards from "../data/brainrot.json";
import { generateStats } from "./stats";

// ── Helpers ────────────────────────────────────────────────────────────────
export function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
export function formatTime(ms: number) { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }
export function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }
export function rollRarity(rates: Record<string, number>, pityCount: number, pityThreshold: number): string {
  if (pityCount >= pityThreshold - 1) return "Epic";
  const total = Object.values(rates).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (const [r, w] of Object.entries(rates)) { roll -= w; if (roll <= 0) return r; }
  return "Common";
}
export function pickCard(rarity: string): { name: string; rarity: string; image: string } {
  const pool = (cards as { name: string; rarity: string; image: string }[]).filter((c) => c.rarity === rarity);
  const src = pool.length > 0 ? pool : (cards as { name: string; rarity: string; image: string }[]);
  return src[Math.floor(Math.random() * src.length)];
}
export function makeOwned(c: { name: string; rarity: string; image: string }): OwnedCard { return { ...c, stats: generateStats(c.name, c.rarity), id: uid(), stars: 1, obtainedAt: Date.now() }; }
export function weightedRandomItem(): Omit<Item, "id" | "quantity"> {
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
export function rollDrops(count: number): Item[] { return Array.from({ length: count }, () => ({ ...weightedRandomItem(), id: uid(), quantity: 1 })); }
export function countItem(items: Item[], name: string): number { return items.filter((i) => i.name === name).length; }
export function removeItems(items: Item[], name: string, qty: number): Item[] {
  let removed = 0;
  return items.filter((i) => { if (i.name === name && removed < qty) { removed++; return false; } return true; });
}
export function addItem(items: Item[], name: string): Item[] {
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
  const def = ITEM_POOL.find((i) => i.name === name)!;
  return [...items, { ...def, id: uid(), quantity: 1 }];
}
export function cardPowerScore(c: OwnedCard): number {
  const s = c.stats;
  return Math.round((s.brainrotPower + s.rizz + s.sigmaAura + s.npcEnergy) * (1 + (c.stars - 1) * 0.15));
}