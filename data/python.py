import json, math, os, re, random, copy, pandas as pd, pathlib

# Load moves JSON
with open(r"C:\Users\sregi\Documents\brainrot_proj\my-brainrot-app\data\brainrot_moves.json", "r", encoding="utf-8") as f:
    moves = json.load(f)

# Default stats by rarity
rarity_defaults = {
    "Common": {"hp": 90, "attack": 18, "defense": 12, "speed": 14},
    "Rare": {"hp": 110, "attack": 24, "defense": 16, "speed": 16},
    "Epic": {"hp": 130, "attack": 30, "defense": 20, "speed": 18},
    "Legendary": {"hp": 160, "attack": 38, "defense": 26, "speed": 20},
    "": {"hp": 95, "attack": 20, "defense": 13, "speed": 14}
}

def parse_effect_to_status(effect_text):
    effects = []
    t = effect_text.lower()

    if "bleed" in t:
        dur = 2
        m = re.search(r'bleed\s*\((\d+)\s*turn', t)
        if m: dur = int(m.group(1))
        effects.append({
            "type": "debuff", "name": "Bleed",
            "chance": 0.2 if "20%" in t else 0.15 if "15%" in t else 0.25,
            "duration": dur,
            "effect": {"stat": "hp", "value": -6, "mode": "per_turn"}
        })

    if "stun" in t:
        dur = 1
        m = re.search(r'stun\s*\((\d+)\s*turn', t)
        if m: dur = int(m.group(1))
        chance = 1.0 if "guaranteed" in t else 0.25 if "25%" in t else 0.2 if "20%" in t else 0.15
        effects.append({
            "type": "debuff", "name": "Stun",
            "chance": chance, "duration": dur,
            "effect": {"skipTurn": True}
        })

    if "confuse" in t:
        dur = 1
        m = re.search(r'confuse\s*\((\d+)\s*turn', t)
        if m: dur = int(m.group(1))
        chance = 0.3 if "30%" in t else 1.0
        effects.append({
            "type": "debuff", "name": "Confuse",
            "chance": chance, "duration": dur,
            "effect": {"missChance": 0.35}
        })

    if "slow" in t:
        effects.append({
            "type": "debuff", "name": "Slow",
            "chance": 1.0, "duration": 2,
            "effect": {"stat": "speed", "value": -0.3, "mode": "percent"}
        })

    if "fear" in t:
        effects.append({
            "type": "debuff", "name": "Fear",
            "chance": 1.0, "duration": 2,
            "effect": {"stat": "attack", "value": -0.2, "mode": "percent"}
        })

    if "boosts own attack" in t or "increases attack" in t:
        effects.append({
            "type": "buff", "name": "AttackUp",
            "chance": 1.0, "duration": 2,
            "effect": {"stat": "attack", "value": 0.25, "mode": "percent"}
        })

    if "increases own speed" in t:
        effects.append({
            "type": "buff", "name": "SpeedUp",
            "chance": 1.0, "duration": 2,
            "effect": {"stat": "speed", "value": 0.25, "mode": "percent"}
        })

    if "reduces incoming damage" in t:
        m = re.search(r'(\d+)%', effect_text)
        pct = int(m.group(1)) / 100 if m else 0.5
        dur = 2 if "2 turns" in t else 1
        effects.append({
            "type": "buff", "name": "DamageReduction",
            "chance": 1.0, "duration": dur,
            "effect": {"damageTakenMultiplier": 1 - pct}
        })

    if "evades" in t:
        m = re.search(r'\((\d+)%', effect_text)
        chance = int(m.group(1)) / 100 if m else 0.5
        effects.append({
            "type": "buff", "name": "Evade",
            "chance": 1.0, "duration": 1,
            "effect": {"evadeChance": chance}
        })

    if "restores" in t and "hp" in t:
        m = re.search(r'restores\s*(\d+)\s*hp', t)
        heal = int(m.group(1)) if m else 10
        effects.append({
            "type": "buff", "name": "Heal",
            "chance": 1.0, "duration": 0,
            "effect": {"heal": heal}
        })

    if "silences" in t:
        effects.append({
            "type": "debuff", "name": "Silence",
            "chance": 1.0, "duration": 1,
            "effect": {"disableMoves": ["special"]}
        })

    if "blocks next debuff" in t:
        effects.append({
            "type": "buff", "name": "DebuffShield",
            "chance": 1.0, "duration": 1,
            "effect": {"blockDebuff": True}
        })

    if "absorbs" in t:
        m = re.search(r'absorbs\s*(\d+)', t)
        shield = int(m.group(1)) if m else 30
        effects.append({
            "type": "buff", "name": "Shield",
            "chance": 1.0, "duration": 2,
            "effect": {"shield": shield}
        })

    return effects

def convert_move(move):
    out = {
        "name": move["name"],
        "power": move.get("damage", 0),
        "accuracy": 0.95 if move.get("damage") else 1.0,
        "effectText": move.get("effect", "")
    }
    se = parse_effect_to_status(out["effectText"])
    if se:
        out["statusEffects"] = se
    return out

refactored = {
    "meta": {"version": "1.0", "notes": "4 moves + structured status effects"},
    "characters": {}
}

for name, info in moves.items():
    rarity = info.get("rarity", "") or ""
    stats = rarity_defaults.get(rarity, rarity_defaults[""])
    refactored["characters"][name] = {
        "rarity": rarity if rarity else "Common",
        "stats": stats,
        "moves": {k: convert_move(v) for k, v in info["moves"].items()}
    }

# Save output JSON next to this script
base = os.path.dirname(__file__)
out = os.path.join(base, "brainrot_game_data.json")

with open(out, "w", encoding="utf-8") as f:
    json.dump(refactored, f, ensure_ascii=False, indent=2)

print("Saved to:", out)
