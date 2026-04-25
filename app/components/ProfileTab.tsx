import { useState } from "react";
import { OwnedCard, Item, UserStats } from "@/lib/types";

export function ProfileTab({ collection, items, shards, stats, onDeleteProfile }: {
  collection: OwnedCard[]; items: Item[]; shards: number;
  stats: UserStats; onDeleteProfile: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const uniqueCards   = new Set(collection.map((c) => c.name)).size;
  const favCount      = collection.filter((c) => c.favorited).length;
  const legendaryOwned= collection.filter((c) => c.rarity === "Legendary").length;
  const epicOwned     = collection.filter((c) => c.rarity === "Epic").length;
  const maxStarCards  = collection.filter((c) => c.stars === 5).length;
  const totalBattles  = stats.wins + stats.losses;
  const winRate       = totalBattles > 0 ? Math.round((stats.wins / totalBattles) * 100) : 0;
  const joined        = new Date(stats.joinedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const statGroups = [
    {
      title: "🃏 Cards",
      rows: [
        { label: "Total cards owned",    value: collection.length },
        { label: "Unique cards",          value: uniqueCards },
        { label: "Favorited",             value: favCount },
        { label: "Legendary owned",       value: legendaryOwned },
        { label: "Epic owned",            value: epicOwned },
        { label: "5★ max cards",          value: maxStarCards },
        { label: "Cards deleted",         value: stats.cardsDeleted },
        { label: "Cards upgraded",        value: stats.cardsUpgraded },
      ],
    },
    {
      title: "📦 Pulls",
      rows: [
        { label: "Total pulls",           value: stats.totalPulls },
        { label: "Regular pulls",         value: stats.regularPulls },
        { label: "Deluxe pulls",          value: stats.deluxePulls },
        { label: "W Key pulls",           value: stats.wKeyPulls },
      ],
    },
    {
      title: "⚔️ Battle",
      rows: [
        { label: "Total battles",         value: totalBattles },
        { label: "Wins",                  value: stats.wins },
        { label: "Losses",                value: stats.losses },
        { label: "Win rate",              value: `${winRate}%` },
      ],
    },
    {
      title: "🪨 Economy",
      rows: [
        { label: "Shards balance",        value: shards },
        { label: "Total shards earned",   value: stats.totalShardsEarned },
        { label: "Total shards spent",    value: stats.totalShardsSpent },
        { label: "Items collected",       value: items.length },
        { label: "Items crafted",         value: stats.itemsCrafted },
        { label: "Items bought",          value: stats.itemsBought },
      ],
    },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Header card */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center text-2xl shrink-0">
          🧠
        </div>
        <div>
          <p className="font-bold text-lg">Brainrot Player</p>
          <p className="text-xs text-zinc-500 mt-0.5">Member since {joined}</p>
          <div className="flex gap-2 mt-2">
            <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">{collection.length} cards</span>
            <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">{totalBattles} battles</span>
            <span className="text-xs bg-amber-900/40 text-amber-300 border border-amber-800 px-2 py-0.5 rounded-full">🪨 {shards}</span>
          </div>
        </div>
      </div>

      {/* Win rate bar */}
      {totalBattles > 0 && (
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-semibold">Battle Record</span>
            <span className="text-zinc-400">{stats.wins}W / {stats.losses}L</span>
          </div>
          <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden flex">
            <div className="h-full bg-green-500 rounded-l-full transition-all" style={{ width: `${winRate}%` }} />
            <div className="h-full bg-red-600 rounded-r-full transition-all" style={{ width: `${100 - winRate}%` }} />
          </div>
          <div className="flex justify-between text-xs text-zinc-500">
            <span className="text-green-400">{winRate}% win rate</span>
            <span className="text-red-400">{100 - winRate}% loss rate</span>
          </div>
        </div>
      )}

      {/* Stat groups */}
      {statGroups.map((group) => (
        <div key={group.title} className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <p className="text-sm font-semibold">{group.title}</p>
          </div>
          <div className="divide-y divide-zinc-800/60">
            {group.rows.map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs text-zinc-400">{label}</span>
                <span className="text-xs font-semibold text-zinc-200">{value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Danger zone */}
      <div className="rounded-xl border border-red-900/60 bg-red-950/10 p-4 space-y-3">
        <p className="text-sm font-semibold text-red-400">Danger Zone</p>
        <p className="text-xs text-zinc-500">Deleting your profile removes all cards, items, shards, battle history, and settings. This cannot be undone.</p>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} className="w-full py-2.5 rounded-lg text-sm font-semibold border border-red-800 text-red-400 hover:bg-red-900/20 transition-all">
            🗑 Delete Profile
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-red-400 font-semibold text-center">Are you absolutely sure? This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={onDeleteProfile} className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-red-700 text-white hover:bg-red-600 active:scale-95 transition-all">Yes, delete everything</button>
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}