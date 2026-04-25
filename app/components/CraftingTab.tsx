import { Item, Recipe, RECIPES, ITEM_RARITY_STYLE } from "@/lib/types";
import { countItem } from "@/lib/utils";

export function CraftingTab({ items, onCraft }: { items: Item[]; onCraft: (recipe: Recipe) => void }) {
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