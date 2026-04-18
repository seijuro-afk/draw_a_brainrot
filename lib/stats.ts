const RARITY_BOOST: Record<string, number> = {
    Common: 5,
    Rare: 20,
    Epic: 40,
    Legendary: 65,
}

const RARITY_BASE: Record<string, number> = {
    Common: 0,
    Rare: 10,
    Epic: 60,
    Legendary: 100,
}

function hashSeed(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash;
}

function seededRand(seed: number, index: number): number {
  const n = hashSeed(seed.toString() + index.toString());
  return n / 4294967295;
}

function statInRange(seed: number, index: number, min: number, max: number): number {
  return Math.round(seededRand(seed, index) * (max - min) + min);
}

const ABILITIES = [
  "Appears from nowhere and stares into your soul.",
  "Emits a frequency that makes NPCs freeze.",
  "Has never lost a staring contest. Ever.",
  "Transforms sigma energy into pure chaos.",
  "Yaps endlessly until enemies surrender.",
  "Radiates an aura of unhinged confidence.",
  "Skips the tutorial and goes straight to boss mode.",
  "NPC dialogue options have no effect on this entity.",
  "Drops from the sky with zero explanation.",
  "Rizz so high it bends reality slightly.",
  "Exists in a permanent state of delusion.",
  "Cannot be ratio'd under any circumstances.",
];

export type CardStats = {
  brainrotPower: number;
  rizz: number;
  sigmaAura: number;
  npcEnergy: number;
  ability: string;
};

export function generateStats(name: string, rarity: string): CardStats {
  const seed = hashSeed(name);
  const boost = RARITY_BOOST[rarity] ?? 0;
  const base = RARITY_BASE[rarity] ?? 0;
  const min = 1;
  const max = Math.min(100, 10 + boost);

  return {
    brainrotPower: statInRange(seed, 1, min, max) + base,
    rizz: statInRange(seed, 2, min, max) + base,
    sigmaAura: statInRange(seed, 3, min, max) + base,
    npcEnergy: statInRange(seed, 4, min, max) + base,
    ability: ABILITIES[seed % ABILITIES.length],
  };
}