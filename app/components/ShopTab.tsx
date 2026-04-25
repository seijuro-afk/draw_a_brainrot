import { Item, ShopItem, SHOP_RESTOCK_MS, ITEM_RARITY_STYLE, ITEM_RARITY_BORDER } from "@/lib/types";
import { countItem, formatTime } from "@/lib/utils";

export function ShopTab({ items, onBuy, shopStock, timeToRestock }: { items: Item[]; onBuy: (si: ShopItem) => void; shopStock: ShopItem[]; timeToRestock: number }) {
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