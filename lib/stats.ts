const RARITY_RANGES: Record<
  string,
  {
    brainrotPower: [number, number]; // attack
    rizz: [number, number];          // hp
    sigmaAura: [number, number];     // defense
    npcEnergy: [number, number];     // mana
  }
> = {
  Common: {
    brainrotPower: [10, 25],
    rizz: [60, 90],
    sigmaAura: [5, 15],
    npcEnergy: [20, 40],
  },
  Rare: {
    brainrotPower: [20, 40],
    rizz: [85, 120],
    sigmaAura: [12, 25],
    npcEnergy: [35, 60],
  },
  Epic: {
    brainrotPower: [35, 60],
    rizz: [120, 160],
    sigmaAura: [20, 40],
    npcEnergy: [55, 85],
  },
  Legendary: {
    brainrotPower: [55, 85],
    rizz: [160, 220],
    sigmaAura: [35, 60],
    npcEnergy: [80, 120],
  },
};

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

export type CardStats = {
  brainrotPower: number; // attack
  rizz: number;         // hp
  sigmaAura: number;    // defense
  npcEnergy: number;    // mana
};

export function generateStats(name: string, rarity: string): CardStats {
  const seed = hashSeed(name);

  const ranges = RARITY_RANGES[rarity] ?? RARITY_RANGES["Common"];

  return {
    brainrotPower: statInRange(seed, 1, ...ranges.brainrotPower),
    rizz: statInRange(seed, 2, ...ranges.rizz),
    sigmaAura: statInRange(seed, 3, ...ranges.sigmaAura),
    npcEnergy: statInRange(seed, 4, ...ranges.npcEnergy),
  };
}