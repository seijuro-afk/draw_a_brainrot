import { Item, BATTLE_USABLE, ITEM_POOL, ITEM_RARITY_STYLE, ITEM_RARITY_BORDER } from "@/lib/types";
import { ShardBadge } from "./shared";

export function InventoryTab({ items, shards }: { items: Item[]; shards: number }) {
  const merged = Object.values(items.reduce<Record<string, Item>>((acc, item) => {
    if (acc[item.name]) acc[item.name] = { ...acc[item.name], quantity: acc[item.name].quantity + 1 }; else acc[item.name] = { ...item }; return acc;
  }, {})).sort((a, b) => { const o: ("Legendary" | "Epic" | "Rare" | "Uncommon" | "Common")[] = ["Legendary", "Epic", "Rare", "Uncommon", "Common"]; return o.indexOf(a.rarity) - o.indexOf(b.rarity); });
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