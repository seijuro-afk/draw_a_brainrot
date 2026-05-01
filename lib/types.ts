// ── Types ──────────────────────────────────────────────────────────────────

export type CardStats = {
  brainrotPower: number; // attack
  rizz: number;         // hp
  sigmaAura: number;    // defense
  npcEnergy: number;    // mana
};

export type Card = { name: string; rarity: string; image: string };
export type OwnedCard = Card & { stats: CardStats; id: string; stars: number; obtainedAt: number; favorited?: boolean };
export type Tab = "packs" | "collection" | "battle" | "inventory" | "crafting" | "shop" | "refinery" | "profile";
export type BannerType = "regular" | "deluxe";
export type SortMode = "power" | "rarity" | "date";
export type ItemRarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";
export type Item = { id: string; name: string; icon: string; rarity: ItemRarity; description: string; quantity: number };
export type StatusEffectDef = {
  type: "buff" | "debuff"; name: string; chance: number; duration: number;
  effect: { stat?: string; value?: number; mode?: string; evadeChance?: number; missChance?: number; skipTurn?: boolean; blockDebuff?: boolean; disableMoves?: string[]; damageTakenMultiplier?: number; shield?: number; heal?: number; };
};
export type MoveKey = "basic" | "special" | "defense" | "ultimate";
export type MoveDef = { name: string; power: number; accuracy: number; effectText: string; statusEffects?: StatusEffectDef[] };
export type CharacterDef = { rarity: string; stats: { hp: number; attack: number; defense: number; speed: number }; moves: { basic: MoveDef; special: MoveDef; defense: MoveDef; ultimate: MoveDef } };
export type ActiveEffect = { name: string; turnsLeft: number; effect: StatusEffectDef["effect"]; type: "buff" | "debuff" };
export type Combatant = { name: string; image: string; rarity: string; maxHp: number; hp: number; attack: number; defense: number; speed: number; mana: number; maxMana: number; effects: ActiveEffect[]; def: CharacterDef; stars: number };
export type BattleLogEntry = { text: string; kind: "player" | "enemy" | "effect" | "info" | "item" };
export type Recipe = { output: string; outputIcon: string; outputRarity: ItemRarity; ingredients: { name: string; icon: string; qty: number }[]; description: string };
export type ShopItem = { name: string; icon: string; rarity: ItemRarity; costItem: string; costIcon: string; costQty: number; stock: number; maxStock: number; description: string };
export type UserStats = {
  username: string;
  totalPulls: number;
  regularPulls: number;
  deluxePulls: number;
  wKeyPulls: number;
  wins: number;
  losses: number;
  totalShardsEarned: number;
  totalShardsSpent: number;
  itemsCrafted: number;
  itemsBought: number;
  cardsDeleted: number;
  cardsUpgraded: number;
  favoritedCount: number;
  joinedAt: number;
};

export type User = {
  username: string;
  password: string;
  collection?: any[];
  items?: any[];
  shards: number;
  regularPity: number;
  shopStock: any[];
  restockAt: number;
  userStats: Omit<UserStats, 'username'>;
  createdAt: number;
  updatedAt: number;
};

export type OwnedCardDocument = {
  userId: string;
  cardId: string;
  cardName: string;
  cardRarity: string;
  cardImage: string;
  stats: CardStats;
  stars: number;
  obtainedAt: number;
  favorited: boolean;
};

export function emptyStats(username?: string): UserStats {
  return { username: username || '', totalPulls: 0, regularPulls: 0, deluxePulls: 0, wKeyPulls: 0, wins: 0, losses: 0, totalShardsEarned: 0, totalShardsSpent: 0, itemsCrafted: 0, itemsBought: 0, cardsDeleted: 0, cardsUpgraded: 0, favoritedCount: 0, joinedAt: Date.now() };
}

// ── Constants ──────────────────────────────────────────────────────────────
export const REGULAR_RATES  = { Common: 70, Rare: 24.7, Epic: 4.5, Legendary: 0.8 };
export const REGULAR_PITY   = 500;
export const DELUXE_RATES   = { Common: 55, Rare: 30, Epic: 11, Legendary: 4 };
export const DELUXE_1_COST  = 100;
export const DELUXE_10_COST = 1000;
export const SHARD_WIN_MIN  = 20;
export const SHARD_WIN_MAX  = 25;
export const SHARD_LOSS     = 5;
export const UPGRADE_COST   = 10;
export const COOLDOWN_MS    = 60 * 1000;
export const SHOP_RESTOCK_MS = 10 * 60 * 1000;

export const ITEM_POOL: Omit<Item, "id" | "quantity">[] = [
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
export const BATTLE_USABLE = ["Sigma Stone", "Rizz Elixir", "Gyatt Gem"] as const;
export type BattleUsable = typeof BATTLE_USABLE[number];

export const RECIPES: Recipe[] = [
  { output: "Gyatt Gem",   outputIcon: "💜", outputRarity: "Epic",
    ingredients: [{ name: "Brainrot Shard", icon: "🪨", qty: 3 }, { name: "NPC Dust", icon: "✨", qty: 2 }],
    description: "Combine brainrot energy with NPC essence." },
  { output: "Rizz Elixir", outputIcon: "🧪", outputRarity: "Epic",
    ingredients: [{ name: "Aura Fragment", icon: "🌀", qty: 2 }, { name: "Mewing Scroll", icon: "📜", qty: 3 }],
    description: "Distill aura and mewing wisdom into pure rizz." },
];

export const SHOP_CATALOG: Omit<ShopItem, "stock">[] = [
  { name: "Rizz Elixir",    icon: "🧪", rarity: "Epic",     costItem: "Skibidi Token",     costIcon: "🪙", costQty: 5, maxStock: 3, description: "Restores 50% HP in battle." },
  { name: "Gyatt Gem",      icon: "💜", rarity: "Epic",     costItem: "Skibidi Token",     costIcon: "🪙", costQty: 5, maxStock: 3, description: "Restores 50% Mana in battle." },
  { name: "Aura Fragment",  icon: "🌀", rarity: "Rare",     costItem: "Fanum Tax Receipt", costIcon: "🧾", costQty: 3, maxStock: 5, description: "Used in crafting." },
  { name: "Mewing Scroll",  icon: "📜", rarity: "Uncommon", costItem: "Fanum Tax Receipt", costIcon: "🧾", costQty: 2, maxStock: 5, description: "Used in crafting." },
  { name: "NPC Dust",       icon: "✨", rarity: "Uncommon", costItem: "Skibidi Token",     costIcon: "🪙", costQty: 2, maxStock: 8, description: "Used in crafting." },
  { name: "Brainrot Shard", icon: "🪨", rarity: "Rare",     costItem: "Fanum Tax Receipt", costIcon: "🧾", costQty: 4, maxStock: 4, description: "Spend on Deluxe pulls or craft." },
];

export const RARITY_ORDER: Record<string, number> = { Common: 0, Uncommon: 1, Rare: 2, Epic: 3, Legendary: 4 };
export const RARITY_STYLE: Record<string, string> = { Common: "bg-zinc-700 text-zinc-200", Rare: "bg-blue-900 text-blue-200", Epic: "bg-purple-900 text-purple-200", Legendary: "bg-amber-900 text-amber-200" };
export const RARITY_BORDER: Record<string, string> = { Common: "border-zinc-700", Rare: "border-blue-700", Epic: "border-purple-600", Legendary: "border-amber-500" };
export const RARITY_GLOW: Record<string, string> = { Common: "", Rare: "shadow-[0_0_18px_2px_rgba(59,130,246,0.25)]", Epic: "shadow-[0_0_18px_2px_rgba(168,85,247,0.3)]", Legendary: "shadow-[0_0_24px_4px_rgba(251,191,36,0.35)]" };
export const ITEM_RARITY_STYLE: Record<ItemRarity, string> = { Common: "bg-zinc-700 text-zinc-200", Uncommon: "bg-green-900 text-green-200", Rare: "bg-blue-900 text-blue-200", Epic: "bg-purple-900 text-purple-200", Legendary: "bg-amber-900 text-amber-200" };
export const ITEM_RARITY_BORDER: Record<ItemRarity, string> = { Common: "border-zinc-700", Uncommon: "border-green-700", Rare: "border-blue-700", Epic: "border-purple-600", Legendary: "border-amber-500" };

export const NAV_ITEMS: { tab: Tab; label: string; icon: string }[] = [
  {tab: "profile", label: "Profile", icon: "👤"} ,
  { tab: "packs",      label: "Packs",      icon: "📦" },
  { tab: "collection", label: "Collection", icon: "📖" },
  { tab: "battle",     label: "Battle",     icon: "⚔️"  },
  { tab: "inventory",  label: "Inventory",  icon: "🎒"  },
  { tab: "crafting",   label: "Crafting",   icon: "🔨"  },
  { tab: "shop",       label: "Shop",       icon: "🏪"  },
  { tab: "refinery",   label: "Refinery",   icon: "⚗️"  },
  
];