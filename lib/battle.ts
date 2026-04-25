import { OwnedCard, CharacterDef, Combatant, MoveDef, StatusEffectDef, ActiveEffect, BattleLogEntry, MoveKey } from "./types";
import gameData from "../data/brainrot_game_data.json";
import { generateStats } from "./stats";

const GAME_DATA = (gameData as unknown as { characters: Record<string, CharacterDef> }).characters;

export function getCharDef(name: string, rarity: string): CharacterDef {
  if (GAME_DATA[name]) return GAME_DATA[name];
  const matches = Object.values(GAME_DATA).filter((c) => c.rarity === rarity);
  return matches.length > 0 ? matches[Math.floor(Math.random() * matches.length)] : Object.values(GAME_DATA)[0];
}

export function makeCombatant(card: OwnedCard): Combatant {
  const def = getCharDef(card.name, card.rarity);
  const boost = 1 + (card.stars - 1) * 0.1;
  return {
    name: card.name, image: card.image, rarity: card.rarity,
    maxHp: Math.round(card.stats.rizz * boost), hp: Math.round(card.stats.rizz * boost),
    attack: Math.round(card.stats.brainrotPower * boost), defense: Math.round(card.stats.sigmaAura * boost),
    speed: def.stats.speed, mana: 0, maxMana: Math.round(card.stats.npcEnergy * boost),
    effects: [], def, stars: card.stars,
  };
}

export function makeEnemyCombatant(): Combatant {
  const cards = require("../data/brainrot.json") as { name: string; rarity: string; image: string }[];
  const ec = cards[Math.floor(Math.random() * cards.length)];
  return makeCombatant({ ...ec, stats: generateStats(ec.name, ec.rarity), id: Math.random().toString(36).slice(2) + Date.now().toString(36), stars: Math.ceil(Math.random() * 3), obtainedAt: 0 });
}

export const MOVE_MANA_PCT: Record<MoveKey, number> = { basic: 0, special: 0.20, defense: 0.15, ultimate: 0.50 };
export const MOVE_GAIN_PCT: Record<MoveKey, number> = { basic: 0.20, special: 0.15, defense: 0.10, ultimate: 0 };
export function moveCost(mk: MoveKey, c: Combatant) { return Math.round(MOVE_MANA_PCT[mk] * c.maxMana); }
export function moveGain(mk: MoveKey, c: Combatant) { return Math.round(MOVE_GAIN_PCT[mk] * c.maxMana); }
export const MOVE_ICONS: Record<MoveKey, string>  = { basic: "⚔️", special: "✨", defense: "🛡️", ultimate: "💥" };
export const MOVE_COLORS: Record<MoveKey, string> = { basic: "border-zinc-600 hover:border-zinc-400 bg-zinc-900", special: "border-blue-700 hover:border-blue-500 bg-blue-950/40", defense: "border-green-700 hover:border-green-500 bg-green-950/30", ultimate: "border-amber-600 hover:border-amber-400 bg-amber-950/30" };

export function applyStatusEffects(defs: StatusEffectDef[], target: Combatant, _src: Combatant, log: BattleLogEntry[]) {
  for (const se of defs) {
    if (se.type === "debuff" && target.effects.some((e) => e.effect.blockDebuff)) { log.push({ text: `${target.name} blocked ${se.name}!`, kind: "effect" }); continue; }
    if (Math.random() < se.chance) { target.effects.push({ name: se.name, turnsLeft: se.duration, effect: se.effect, type: se.type }); log.push({ text: `${target.name} gained ${se.name} (${se.duration}t)`, kind: "effect" }); }
  }
}

export function tickEffects(c: Combatant, log: BattleLogEntry[]) {
  const next: ActiveEffect[] = [];
  for (const eff of c.effects) {
    if (eff.effect.stat === "hp" && eff.effect.mode === "per_turn") { const val = eff.effect.value ?? 0; c.hp = Math.max(0, Math.min(c.maxHp, c.hp + val)); log.push({ text: `${c.name}: ${eff.name} ${val < 0 ? "dealt" : "healed"} ${Math.abs(val)} HP`, kind: "effect" }); }
    if (typeof eff.effect.heal === "number") { c.hp = Math.max(0, Math.min(c.maxHp, c.hp + eff.effect.heal)); log.push({ text: `${c.name} healed ${eff.effect.heal} HP from ${eff.name}`, kind: "effect" }); }
    if (eff.turnsLeft - 1 > 0) next.push({ ...eff, turnsLeft: eff.turnsLeft - 1 }); else log.push({ text: `${c.name}: ${eff.name} wore off`, kind: "info" });
  }
  c.effects = next;
}

export function calcDamage(attacker: Combatant, defender: Combatant, move: MoveDef): number {
  if (move.power === 0) return 0;
  const evade = defender.effects.find((e) => typeof e.effect.evadeChance === "number");
  if (evade && Math.random() < (evade.effect.evadeChance ?? 0)) return -1;
  if (Math.random() > move.accuracy) return -2;
  let atk = attacker.attack;
  for (const eff of attacker.effects) { if (eff.effect.stat === "attack" && eff.effect.mode === "percent") atk = Math.round(atk * (1 + (eff.effect.value ?? 0))); }
  let dmg = Math.max(1, Math.round((move.power * atk) / (defender.defense + 10)));
  for (const eff of defender.effects) { if (typeof eff.effect.damageTakenMultiplier === "number") dmg = Math.round(dmg * eff.effect.damageTakenMultiplier); }
  const shieldEff = defender.effects.find((e) => typeof e.effect.shield === "number");
  if (shieldEff && typeof shieldEff.effect.shield === "number") { const abs = Math.min(shieldEff.effect.shield, dmg); shieldEff.effect.shield! -= abs; dmg -= abs; if (shieldEff.effect.shield! <= 0) defender.effects = defender.effects.filter((e) => e !== shieldEff); }
  return Math.max(0, dmg);
}