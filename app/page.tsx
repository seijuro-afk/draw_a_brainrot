"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import cards from "../data/brainrot.json";
import gameData from "../data/brainrot_game_data.json";
import { CardStats } from "../lib/types";  
import { generateStats } from "../lib/stats";
import Image from "next/image";
import { PacksTab } from "./components/PacksTab";
import { CollectionTab } from "./components/CollectionTab";
import { BattleTab } from "./components/BattleTab";
import { InventoryTab } from "./components/InventoryTab";
import { CraftingTab } from "./components/CraftingTab";
import { ShopTab } from "./components/ShopTab";
import { RefineryTab } from "./components/RefineryTab";
import { ProfileTab } from "./components/ProfileTab";
import { ShardBadge, StarRow, MiniCard, HpBar, ManaBar, EffectPills, CombatantCard } from "./components/shared";
import { countItem, removeItems, addItem, formatTime, uid, rollRarity, pickCard, makeOwned, weightedRandomItem, rollDrops, cardPowerScore } from "../lib/utils";
import {
  Card, OwnedCard, Tab, BannerType, SortMode, ItemRarity, Item, StatusEffectDef, MoveDef, CharacterDef, ActiveEffect, Combatant, BattleLogEntry, Recipe, ShopItem, UserStats, emptyStats,
  REGULAR_RATES, REGULAR_PITY, DELUXE_RATES, DELUXE_1_COST, DELUXE_10_COST, SHARD_WIN_MIN, SHARD_WIN_MAX, SHARD_LOSS, UPGRADE_COST, COOLDOWN_MS, SHOP_RESTOCK_MS,
  ITEM_POOL, BATTLE_USABLE, RECIPES, SHOP_CATALOG, RARITY_ORDER, RARITY_STYLE, RARITY_BORDER, RARITY_GLOW, ITEM_RARITY_STYLE, ITEM_RARITY_BORDER, NAV_ITEMS
} from "../lib/types";

const GAME_DATA = (gameData as unknown as { characters: Record<string, CharacterDef> }).characters;

// ── Main Page ──────────────────────────────────────────────────────────────
// ── Battle Tab ─────────────────────────────────────────────────────────────
// ── Inventory Tab ──────────────────────────────────────────────────────────
// ── Crafting Tab ───────────────────────────────────────────────────────────
// ── Shop Tab ───────────────────────────────────────────────────────────────
// ── Refinery Tab ───────────────────────────────────────────────────────────
// ── Profile Tab ────────────────────────────────────────────────────────────
// ── Main Page ──────────────────────────────────────────────────────────────
function initShopStock(): ShopItem[] { return SHOP_CATALOG.map((s) => ({ ...s, stock: s.maxStock })); }

const LS_KEYS = ["collection", "items", "shards", "regularPity", "shopStock", "restockAt", "regularCooldown", "userStats"];

export default function Home() {
  const router = useRouter();
  const [activeTab,      setActiveTab]      = useState<Tab>("packs");
  const [collection,     setCollection]     = useState<OwnedCard[]>([]);
  const [items,          setItems]          = useState<Item[]>([]);
  const [shards,         setShards]         = useState(0);
  const [regularPity,    setRegularPity]    = useState(0);
  const [shopStock,      setShopStock]      = useState<ShopItem[]>(initShopStock());
  const [restockAt,      setRestockAt]      = useState<number>(Date.now() + SHOP_RESTOCK_MS);
  const [timeToRestock,  setTimeToRestock]  = useState(SHOP_RESTOCK_MS);
  const [userStats,      setUserStats]      = useState<UserStats>(emptyStats());
  const [username,       setUsername]       = useState<string>('');
  const [loading,        setLoading]        = useState(true);

  useEffect(() => {
    const savedUsername = localStorage.getItem('username');
    if (savedUsername) {
      setUsername(savedUsername);
    } else {
      router.push('/login');
      return;
    }
  }, [router]);

  useEffect(() => {
    if (username) {
      loadData();
    }
  }, [username]);

  async function loadData() {
    try {
      const response = await fetch(`/api/user?username=${username}`);
      if (response.ok) {
        const data = await response.json();
        setCollection(data.collection || []);
        setItems(data.items || []);
        setShards(data.shards || 0);
        setRegularPity(data.regularPity || 0);
        setShopStock(data.shopStock || initShopStock());
        setUserStats({ ...emptyStats(), ...data.userStats });
        if (data.restockAt) {
          const at = Number(data.restockAt);
          if (at > Date.now()) {
            setRestockAt(at);
          } else {
            const next = Date.now() + SHOP_RESTOCK_MS;
            setRestockAt(next);
            saveData({ restockAt: next, shopStock: initShopStock() });
          }
        } else {
          const next = Date.now() + SHOP_RESTOCK_MS;
          setRestockAt(next);
          saveData({ restockAt: next });
        }
      } else {
        // New user, initialize
        const next = Date.now() + SHOP_RESTOCK_MS;
        setRestockAt(next);
        setUserStats(emptyStats(username));
        saveData({ restockAt: next, userStats: emptyStats(username) });
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function saveData(updates: Partial<{
    collection: OwnedCard[];
    items: Item[];
    shards: number;
    regularPity: number;
    shopStock: ShopItem[];
    restockAt: number;
    userStats: UserStats;
  }>) {
    try {
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          collection,
          items,
          shards,
          regularPity,
          shopStock,
          restockAt,
          userStats,
          ...updates,
        }),
      });
      if (!response.ok) {
        console.error('Failed to save data:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  }

  useEffect(() => {
    const iv = setInterval(() => {
      const rem = restockAt - Date.now();
      if (rem <= 0) { const next = Date.now() + SHOP_RESTOCK_MS; const fresh = initShopStock(); setRestockAt(next); setShopStock(fresh); setTimeToRestock(SHOP_RESTOCK_MS); saveData({ shopStock: fresh, restockAt: next }); }
      else setTimeToRestock(rem);
    }, 1000);
    return () => clearInterval(iv);
  }, [restockAt, username]);

  // ── Persisted setters ───────────────────────────────────────────────────
  const saveCollection  = useCallback((c: OwnedCard[]) => { setCollection(c);  saveData({ collection: c }); }, [username]);
  const saveItems       = useCallback((i: Item[])      => { setItems(i);        saveData({ items: i }); }, [username]);
  const saveShards      = useCallback((n: number)      => { setShards(n);       saveData({ shards: n }); }, [username]);
  const saveRegularPity = useCallback((n: number)      => { setRegularPity(n);  saveData({ regularPity: n }); }, [username]);
  const saveShopStock   = useCallback((ss: ShopItem[]) => { setShopStock(ss);   saveData({ shopStock: ss }); }, [username]);
  const saveUserStats   = useCallback((us: UserStats)  => { setUserStats(us);   saveData({ userStats: us }); }, [username]);
  const patchStats      = useCallback((patch: Partial<UserStats>) => {
    setUserStats((prev) => {
      const next = { ...prev, ...patch } as UserStats;
      saveData({ userStats: next });
      return next;
    });
  }, [username]);

  function handleUpdateUsername(newUsername: string) {
    const trimmed = newUsername.trim();
    setUsername(trimmed);
    localStorage.setItem('username', trimmed);
    setUserStats(prev => ({ ...prev, username: trimmed }));
    saveData({ userStats: { ...userStats, username: trimmed } });
  }
  function handleKeepCards(newCards: OwnedCard[], source: "regular" | "deluxe" | "wkey") {
    saveCollection([...collection, ...newCards]);
    patchStats({
      totalPulls:   userStats.totalPulls   + newCards.length,
      regularPulls: userStats.regularPulls + (source === "regular" ? newCards.length : 0),
      deluxePulls:  userStats.deluxePulls  + (source === "deluxe"  ? newCards.length : 0),
      wKeyPulls:    userStats.wKeyPulls    + (source === "wkey"    ? newCards.length : 0),
    });
  }
  function handleSpendShards(n: number) {
    saveShards(Math.max(0, shards - n));
    patchStats({ totalShardsSpent: userStats.totalShardsSpent + n });
  }
  function handleBattleEnd(drops: Item[], earned: number, won: boolean) {
    saveItems([...items, ...drops]);
    saveShards(shards + earned);
    patchStats({
      wins:               userStats.wins   + (won ? 1 : 0),
      losses:             userStats.losses + (won ? 0 : 1),
      totalShardsEarned:  userStats.totalShardsEarned + earned,
    });
  }
  function handleUpgrade(targetId: string, sacrificeIds: string[]) {
    saveCollection(collection.filter((c) => !sacrificeIds.includes(c.id)).map((c) => c.id === targetId ? { ...c, stars: Math.min(5, c.stars + 1) } : c));
    patchStats({ cardsUpgraded: userStats.cardsUpgraded + 1 });
  }
  function handleFavorite(id: string) {
    const card = collection.find((c) => c.id === id);
    saveCollection(collection.map((c) => c.id === id ? { ...c, favorited: !c.favorited } : c));
    if (card) patchStats({ favoritedCount: userStats.favoritedCount + (card.favorited ? -1 : 1) });
  }
  function handleDeleteCard(id: string) {
    saveCollection(collection.filter((c) => c.id !== id));
    patchStats({ cardsDeleted: userStats.cardsDeleted + 1 });
  }
  function handleUseWKey(): boolean {
    if (countItem(items, "W Key") === 0) return false;
    saveItems(removeItems(items, "W Key", 1)); return true;
  }
  function handleUseItem(name: string) { saveItems(removeItems(items, name, 1)); }
  function handleCraft(recipe: Recipe) {
    let ni = [...items];
    for (const ing of recipe.ingredients) ni = removeItems(ni, ing.name, ing.qty);
    saveItems(addItem(ni, recipe.output));
    patchStats({ itemsCrafted: userStats.itemsCrafted + 1 });
  }
  function handleBuy(si: ShopItem) {
    if (countItem(items, si.costItem) < si.costQty || si.stock <= 0) return;
    saveItems(addItem(removeItems(items, si.costItem, si.costQty), si.name));
    saveShopStock(shopStock.map((s) => s.name === si.name ? { ...s, stock: s.stock - 1 } : s));
    patchStats({ itemsBought: userStats.itemsBought + 1 });
  }
  function handleDeleteProfile() {
    LS_KEYS.forEach((k) => localStorage.removeItem(k));
    setCollection([]); setItems([]); setShards(0); setRegularPity(0);
    setShopStock(initShopStock()); setUserStats(emptyStats());
    const next = Date.now() + SHOP_RESTOCK_MS;
    setRestockAt(next); localStorage.setItem("restockAt", String(next));
    setActiveTab("packs");
  }

  const uniqueCards = new Set(collection.map((c) => c.name)).size;

  return (
    <div className="min-h-screen flex bg-zinc-950 text-white">
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-zinc-400">Loading...</div>
        </div>
      ) : (
        <>
          {/* Sidebar */}
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

          {/* Main area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top bar — login / signup */}
            <header className="shrink-0 h-14 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-6 gap-2">
              <div className="text-sm text-zinc-400">
                Logged in as: <span className="text-zinc-200 font-medium">{username}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { localStorage.removeItem('username'); router.push('/login'); }} className="px-4 py-1.5 rounded-lg text-sm font-medium text-zinc-300 border border-zinc-700 hover:border-zinc-500 hover:text-white transition-all">
                  Log out
                </button>
              </div>
            </header>

            {/* Page content */}
            <main className="flex-1 flex flex-col p-8 overflow-hidden">
              <div className="w-full max-w-lg mx-auto flex flex-col h-full">
                <div className="mb-6 shrink-0">
                  <h2 className="text-2xl font-bold tracking-tight">{NAV_ITEMS.find((n) => n.tab === activeTab)?.label}</h2>
                </div>
                <div className={`flex-1 min-h-0 ${activeTab === "battle" || activeTab === "collection" ? "overflow-hidden" : "overflow-y-auto"}`}>
                  {activeTab === "packs"      && <PacksTab shards={shards} regularPity={regularPity} onKeepCards={handleKeepCards} onSpendShards={handleSpendShards} onRegularPull={saveRegularPity} onUseWKey={handleUseWKey} />}
                  {activeTab === "collection" && <CollectionTab collection={collection} onFavorite={handleFavorite} onDelete={handleDeleteCard} />}
                  {activeTab === "battle"     && <BattleTab collection={collection} items={items} onBattleEnd={handleBattleEnd} onUseItem={handleUseItem} />}
                  {activeTab === "inventory"  && <InventoryTab items={items} shards={shards} />}
                  {activeTab === "crafting"   && <CraftingTab items={items} onCraft={handleCraft} />}
                  {activeTab === "shop"       && <ShopTab items={items} onBuy={handleBuy} shopStock={shopStock} timeToRestock={timeToRestock} />}
                  {activeTab === "refinery"   && <RefineryTab collection={collection} onUpgrade={handleUpgrade} />}
                  {activeTab === "profile"    && <ProfileTab collection={collection} items={items} shards={shards} stats={userStats} onDeleteProfile={handleDeleteProfile} />}
                </div>
              </div>
            </main>
          </div>
        </>
      )}
    </div>
  );
}