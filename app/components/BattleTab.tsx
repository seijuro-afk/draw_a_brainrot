import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { OwnedCard, SortMode, RARITY_ORDER, RARITY_BORDER, RARITY_GLOW, Item, BattleUsable, BATTLE_USABLE, ITEM_POOL, ITEM_RARITY_STYLE, ITEM_RARITY_BORDER, SHARD_WIN_MIN, SHARD_WIN_MAX, SHARD_LOSS, MoveKey, Combatant, BattleLogEntry } from "@/lib/types";
import { CombatantCard, StarRow } from "./shared";
import { cardPowerScore, countItem, rollDrops, clamp } from "@/lib/utils";
import { makeCombatant, makeEnemyCombatant, moveCost, moveGain, calcDamage, applyStatusEffects, tickEffects, MOVE_ICONS, MOVE_COLORS } from "@/lib/battle";

export function BattleTab({ collection, items, onBattleEnd, onUseItem }: { collection: OwnedCard[]; items: Item[]; onBattleEnd: (drops: Item[], shards: number, won: boolean) => void; onUseItem: (name: string) => void }) {
  const [phase, setPhase]           = useState<"select" | "fighting">("select");
  const [sortMode, setSortMode]     = useState<SortMode>("power");
  const [playerCard, setPlayerCard] = useState<OwnedCard | null>(null);
  const [player, setPlayer]         = useState<Combatant | null>(null);
  const [enemy, setEnemy]           = useState<Combatant | null>(null);
  const [log, setLog]               = useState<BattleLogEntry[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [battleOver, setBattleOver]     = useState<null | "player" | "enemy">(null);
  const [pendingDrops, setPendingDrops] = useState<Item[]>([]);
  const [pendingShards, setPendingShards] = useState(0);
  const [enemyThinking, setEnemyThinking] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log]);

  const sorted = [...collection].sort((a, b) => sortMode === "power" ? cardPowerScore(b) - cardPowerScore(a) : sortMode === "rarity" ? (RARITY_ORDER[b.rarity] ?? 0) - (RARITY_ORDER[a.rarity] ?? 0) : b.obtainedAt - a.obtainedAt);
  function addLog(entries: BattleLogEntry[]) { setLog((prev) => [...prev, ...entries]); }

  function startBattle() {
    if (!playerCard) return;
    const p = makeCombatant(playerCard), e = makeEnemyCombatant();
    const pFirst = p.speed >= e.speed;
    setPlayer(p); setEnemy(e);
    setLog([{ text: `Battle start! ${p.name} vs ${e.name} — ${pFirst ? "you go first" : e.name + " goes first"}`, kind: "info" }]);
    setIsPlayerTurn(pFirst); setBattleOver(null); setEnemyThinking(false); setPhase("fighting");
    if (!pFirst) { setEnemyThinking(true); setTimeout(() => doEnemyTurn(p, e), 900); }
  }

  function useItemInBattle(itemName: BattleUsable) {
    if (!player || battleOver || !isPlayerTurn || enemyThinking || countItem(items, itemName) === 0) return;
    onUseItem(itemName);
    const np = { ...player, effects: [...player.effects] };
    const nl: BattleLogEntry[] = [];
    if (itemName === "Sigma Stone") { np.hp = np.maxHp; np.mana = np.maxMana; nl.push({ text: "💎 Sigma Stone — full HP & Mana restored!", kind: "item" }); }
    else if (itemName === "Rizz Elixir") { const h = Math.round(np.maxHp * 0.5); np.hp = clamp(np.hp + h, 0, np.maxHp); nl.push({ text: `🧪 Rizz Elixir — restored ${h} HP`, kind: "item" }); }
    else if (itemName === "Gyatt Gem") { const m = Math.round(np.maxMana * 0.5); np.mana = clamp(np.mana + m, 0, np.maxMana); nl.push({ text: `💜 Gyatt Gem — restored ${m} Mana`, kind: "item" }); }
    setPlayer(np); addLog(nl);
    if (enemy) { setIsPlayerTurn(false); setEnemyThinking(true); setTimeout(() => doEnemyTurn(np, enemy), 900); }
  }

  function executeMove(moveKey: MoveKey) {
    if (!player || !enemy || !isPlayerTurn || battleOver || enemyThinking) return;
    const move = player.def.moves[moveKey];
    const manaCost = moveCost(moveKey, player);
    if (player.mana < manaCost) { addLog([{ text: `Not enough mana for ${move.name}!`, kind: "info" }]); return; }
    const np = { ...player, effects: [...player.effects], mana: clamp(player.mana - manaCost + moveGain(moveKey, player), 0, player.maxMana) };
    const ne = { ...enemy,  effects: [...enemy.effects] };
    const nl: BattleLogEntry[] = [];
    nl.push({ text: `▶ You used ${move.name}`, kind: "player" });
    if (move.power > 0) {
      const dmg = calcDamage(np, ne, move);
      if (dmg === -1) nl.push({ text: `${ne.name} evaded!`, kind: "effect" });
      else if (dmg === -2) nl.push({ text: `${move.name} missed!`, kind: "info" });
      else { ne.hp = clamp(ne.hp - dmg, 0, ne.maxHp); nl.push({ text: `Dealt ${dmg} dmg to ${ne.name} (${ne.hp}/${ne.maxHp} HP)`, kind: "player" }); }
    }
    applyStatusEffects((move.statusEffects ?? []).filter((se) => se.type === "debuff"), ne, np, nl);
    applyStatusEffects((move.statusEffects ?? []).filter((se) => se.type === "buff"),   np, np, nl);
    if (ne.effects.some((e) => e.effect.skipTurn)) { nl.push({ text: `${ne.name} is stunned — skips turn!`, kind: "effect" }); ne.effects = ne.effects.filter((e) => !e.effect.skipTurn); }
    tickEffects(ne, nl); tickEffects(np, nl);
    setPlayer(np); setEnemy(ne); addLog(nl);
    if (ne.hp <= 0) { endBattle("player", np, ne); return; }
    if (np.hp <= 0) { endBattle("enemy",  np, ne); return; }
    setIsPlayerTurn(false); setEnemyThinking(true);
    setTimeout(() => doEnemyTurn(np, ne), 900);
  }

  function doEnemyTurn(cp: Combatant, ce: Combatant) {
    const np = { ...cp, effects: [...cp.effects] };
    const ne = { ...ce, effects: [...ce.effects] };
    const nl: BattleLogEntry[] = [];
    let mk: MoveKey = "basic";
    if (ne.hp < ne.maxHp * 0.3 && ne.mana >= moveCost("ultimate", ne)) mk = "ultimate";
    else if (ne.mana >= moveCost("special", ne) && Math.random() < 0.4) mk = "special";
    else if (ne.hp < ne.maxHp * 0.5 && ne.mana >= moveCost("defense", ne) && Math.random() < 0.3) mk = "defense";
    const move = ne.def.moves[mk];
    ne.mana = clamp(ne.mana - moveCost(mk, ne) + moveGain(mk, ne), 0, ne.maxMana);
    nl.push({ text: `◀ ${ne.name} used ${move.name}`, kind: "enemy" });
    if (move.power > 0) {
      const dmg = calcDamage(ne, np, move);
      if (dmg === -1) nl.push({ text: `You evaded!`, kind: "effect" });
      else if (dmg === -2) nl.push({ text: `${move.name} missed!`, kind: "info" });
      else { np.hp = clamp(np.hp - dmg, 0, np.maxHp); nl.push({ text: `Took ${dmg} dmg (${np.hp}/${np.maxHp} HP)`, kind: "player" }); }
    }
    applyStatusEffects((move.statusEffects ?? []).filter((se) => se.type === "debuff"), np, ne, nl);
    applyStatusEffects((move.statusEffects ?? []).filter((se) => se.type === "buff"),   ne, ne, nl);
    tickEffects(np, nl); tickEffects(ne, nl);
    setPlayer(np); setEnemy(ne); addLog(nl); setEnemyThinking(false);
    if (np.hp <= 0) { endBattle("enemy",  np, ne); return; }
    if (ne.hp <= 0) { endBattle("player", np, ne); return; }
    setIsPlayerTurn(true);
  }

  function endBattle(winner: "player" | "enemy", fp: Combatant, fe: Combatant) {
    const win = winner === "player";
    const drops = rollDrops(win ? Math.floor(Math.random() * 3) + 2 : 1);
    const shards = win ? Math.floor(Math.random() * (SHARD_WIN_MAX - SHARD_WIN_MIN + 1)) + SHARD_WIN_MIN : SHARD_LOSS;
    addLog([{ text: win ? `🏆 Victory! +${shards} 🪨 shards` : `💀 Defeated. +${shards} 🪨 consolation`, kind: "info" }]);
    setBattleOver(winner); setPendingDrops(drops); setPendingShards(shards);
  }
  function claimAndReset() { onBattleEnd(pendingDrops, pendingShards, battleOver === "player"); setPhase("select"); setPlayer(null); setEnemy(null); setLog([]); setBattleOver(null); setPlayerCard(null); }

  if (phase === "select") {
    if (!collection.length) return <div className="flex flex-col items-center gap-3 py-20 text-zinc-600"><span style={{ fontSize: 48 }}>⚔️</span><p className="text-sm">Pull some cards first</p></div>;
    return (
      <div className="flex flex-col h-full" style={{ height: "calc(100vh - 200px)" }}>
        <div className="shrink-0 space-y-3 mb-3">
          <div className="flex items-center gap-2">
            <p className="text-xs text-zinc-500 uppercase tracking-wide flex-1">Choose your fighter</p>
            <div className="flex rounded-lg overflow-hidden border border-zinc-800 text-xs">
              {(["power", "rarity", "date"] as SortMode[]).map((m) => (
                <button key={m} onClick={() => setSortMode(m)} className={`px-2.5 py-1.5 font-medium capitalize transition-all ${sortMode === m ? "bg-zinc-700 text-white" : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"}`}>
                  {m === "power" ? "⚡ Power" : m === "rarity" ? "💎 Rarity" : "🕐 Date"}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-zinc-500">Win → earn <span className="text-amber-300 font-semibold">🪨 {SHARD_WIN_MIN}–{SHARD_WIN_MAX} shards</span> · Items usable mid-battle</div>
        </div>
        <div className="flex-1 overflow-y-auto pr-1 min-h-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-3">
            {sorted.map((c) => (
              <button key={c.id} onClick={() => setPlayerCard(playerCard?.id === c.id ? null : c)} className={`rounded-xl border-2 transition-all p-2 flex flex-col items-center gap-1.5 bg-zinc-900 ${playerCard?.id === c.id ? (RARITY_BORDER[c.rarity] ?? "border-zinc-700") + " scale-105 " + (RARITY_GLOW[c.rarity] ?? "") : "border-zinc-800 hover:border-zinc-600"}`}>
                <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-zinc-800"><Image src={c.image} alt={c.name} fill sizes="100px" style={{ objectFit: "cover" }} /></div>
                <p className="text-xs font-semibold text-center w-full truncate">{c.name}</p>
                <StarRow count={c.stars} />
                <p className="text-xs text-zinc-500">{cardPowerScore(c)} pwr</p>
              </button>
            ))}
          </div>
        </div>
        <div className="shrink-0 pt-3 border-t border-zinc-800">
          <button onClick={startBattle} disabled={!playerCard} className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${playerCard ? "bg-red-600 text-white hover:bg-red-500 active:scale-95" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}>{playerCard ? `Battle with ${playerCard.name}` : "Select a card to battle"}</button>
        </div>
      </div>
    );
  }

  if (player && enemy) {
    const moveKeys: MoveKey[] = ["basic", "special", "defense", "ultimate"];
    const battleItems = BATTLE_USABLE.map((name) => ({ name, count: countItem(items, name) })).filter((i) => i.count > 0);
    return (
      <div className="flex flex-col gap-3" style={{ height: "calc(100vh - 200px)" }}>
        <div className="flex gap-3 shrink-0">
          <CombatantCard c={player} side="player" />
          <div className="flex items-center justify-center text-xl font-black text-red-500 shrink-0">VS</div>
          <CombatantCard c={enemy} side="enemy" />
        </div>
        <div ref={logRef} className="flex-1 overflow-y-auto rounded-xl bg-zinc-900 border border-zinc-800 p-3 space-y-1 min-h-0">
          {log.map((entry, i) => <p key={i} className={`text-xs font-mono ${entry.kind === "player" ? "text-blue-300" : entry.kind === "enemy" ? "text-red-300" : entry.kind === "effect" ? "text-amber-300" : entry.kind === "item" ? "text-green-300" : "text-zinc-500"}`}>{entry.text}</p>)}
          {enemyThinking && <p className="text-xs text-zinc-600 italic animate-pulse">Enemy is thinking…</p>}
        </div>
        <div className="shrink-0 space-y-2">
          {battleOver ? (
            <div className="space-y-2">
              <div className={`rounded-xl border-2 p-3 text-center ${battleOver === "player" ? "border-green-600 bg-green-950/30" : "border-red-700 bg-red-950/20"}`}>
                <p className="font-black text-lg">{battleOver === "player" ? "🏆 Victory!" : "💀 Defeated"}</p>
                <p className="text-sm text-amber-300 font-semibold">+{pendingShards} 🪨 shards</p>
                {pendingDrops.length > 0 && <div className="flex flex-wrap gap-1.5 justify-center mt-2">{pendingDrops.map((item) => <span key={item.id} className={`text-xs px-2 py-0.5 rounded-full border ${ITEM_RARITY_BORDER[item.rarity]} ${ITEM_RARITY_STYLE[item.rarity]}`}>{item.icon} {item.name}</span>)}</div>}
              </div>
              <button onClick={claimAndReset} className="w-full py-2.5 rounded-xl font-semibold text-sm bg-white text-black hover:bg-zinc-200 active:scale-95 transition-all">Claim & battle again</button>
            </div>
          ) : (
            <>
              {battleItems.length > 0 && (
                <div className="flex gap-2 pb-1 flex-wrap">
                  {battleItems.map(({ name, count }) => {
                    const def = ITEM_POOL.find((i) => i.name === name)!;
                    const canUse = isPlayerTurn && !enemyThinking;
                    return <button key={name} onClick={() => useItemInBattle(name as BattleUsable)} disabled={!canUse} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${canUse ? "border-green-700 bg-green-950/30 text-green-300 hover:bg-green-900/50 active:scale-95" : "border-zinc-800 bg-zinc-900 text-zinc-600 cursor-not-allowed opacity-50"}`} title={def.description}>{def.icon} {name.split(" ")[0]} <span className="opacity-60">×{count}</span></button>;
                  })}
                </div>
              )}
              <p className="text-xs text-zinc-500 text-center">{isPlayerTurn ? "Your turn — pick a move" : "Enemy's turn…"}</p>
              <div className="grid grid-cols-2 gap-2">
                {moveKeys.map((mk) => {
                  const move = player.def.moves[mk];
                  const cost = moveCost(mk, player);
                  const disabled = !isPlayerTurn || !!battleOver || player.mana < cost || enemyThinking;
                  return (
                    <button key={mk} onClick={() => executeMove(mk)} disabled={disabled} className={`rounded-xl border-2 p-2.5 text-left transition-all ${disabled ? "border-zinc-800 bg-zinc-900 opacity-40 cursor-not-allowed" : MOVE_COLORS[mk] + " active:scale-95"}`}>
                      <div className="flex items-center justify-between mb-1"><span className="text-xs font-bold">{MOVE_ICONS[mk]} {move.name}</span>{cost > 0 && <span className="text-xs text-blue-400">{cost}MP</span>}</div>
                      <p className="text-xs text-zinc-400 leading-tight line-clamp-2">{move.effectText}</p>
                      {move.power > 0 && <p className="text-xs text-zinc-500 mt-1">PWR {move.power}</p>}
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