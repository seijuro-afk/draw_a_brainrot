"use client";

import { useEffect, useState } from "react";
import cards from "../data/brainrot.json";
import { generateStats, CardStats } from "../lib/stats";

const RARITY_STYLE: Record<string, string> = {
  Common: "bg-zinc-700 text-zinc-200",
  Rare: "bg-blue-900 text-blue-200",
  Epic: "bg-purple-900 text-purple-200",
  Legendary: "bg-amber-900 text-amber-200",
};

const RARITY_BORDER: Record<string, string> = {
  Common: "border-zinc-700",
  Rare: "border-blue-700",
  Epic: "border-purple-600",
  Legendary: "border-amber-500",
};

type Card = { name: string; rarity: string; image: string };

const STATS = [
  { key: "brainrotPower", label: "Brainrot Power", color: "bg-red-500" },
  { key: "rizz", label: "Rizz", color: "bg-pink-500" },
  { key: "sigmaAura", label: "Sigma Aura", color: "bg-purple-500" },
  { key: "npcEnergy", label: "NPC Energy", color: "bg-blue-500" },
] as const;

const COOLDOWN_MS = 1 * 60 * 1000; // 1 minute

export default function Home() {
  const [card, setCard] = useState<Card | null>(null);
  const [stats, setStats] = useState<CardStats | null>(null);
  const [flipping, setFlipping] = useState(false);

  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  // Load cooldown from localStorage on page load
  useEffect(() => {
    const saved = localStorage.getItem("cooldownUntil");
    if (saved) {
      const until = Number(saved);
      if (until > Date.now()) {
        setCooldownUntil(until);
      } else {
        localStorage.removeItem("cooldownUntil");
      }
    }
  }, []);

  // Countdown updater
  useEffect(() => {
    if (!cooldownUntil) return;

    const interval = setInterval(() => {
      const remaining = cooldownUntil - Date.now();
      if (remaining <= 0) {
        setCooldownUntil(null);
        setTimeLeft(0);
        localStorage.removeItem("cooldownUntil");
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownUntil]);

  function formatTime(ms: number) {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  function draw() {
    // prevent drawing if still on cooldown
    if (cooldownUntil && cooldownUntil > Date.now()) return;

    setFlipping(true);

    setTimeout(() => {
      const picked = cards[Math.floor(Math.random() * cards.length)] as Card;
      setCard(picked);
      setStats(generateStats(picked.name, picked.rarity));
      setFlipping(false);

      // start cooldown
      const until = Date.now() + COOLDOWN_MS;
      setCooldownUntil(until);
      localStorage.setItem("cooldownUntil", until.toString());
    }, 300);
  }

  const isCooldown = cooldownUntil !== null && cooldownUntil > Date.now();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8 bg-zinc-950 text-white">
      <h1 className="text-3xl font-bold tracking-tight">Brainrot Card Draw</h1>

      <div
        className={`w-64 rounded-2xl border-2 bg-zinc-900 p-5 flex flex-col items-center gap-4 transition-all duration-300
          ${card ? RARITY_BORDER[card.rarity] ?? "border-zinc-700" : "border-zinc-800"}
          ${flipping ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}
      >
        {card ? (
          <>
            <div className="relative w-44 h-44 rounded-xl overflow-hidden bg-zinc-800">
              <img
                src={`/${card.image.replace(/^\/+/, "")}`}
                alt={card.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>

            <div className="flex flex-col items-center gap-1 w-full">
              <span
                className={`text-xs px-3 py-0.5 rounded-full font-medium ${
                  RARITY_STYLE[card.rarity] ?? "bg-zinc-700 text-zinc-300"
                }`}
              >
                {card.rarity}
              </span>
              <p className="font-semibold text-center text-base mt-1">
                {card.name}
              </p>
            </div>

            {stats && (
              <div className="w-full space-y-2">
                {STATS.map(({ key, label, color }) => (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-400">{label}</span>
                      <span className="font-medium">{stats[key]}</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full transition-all duration-700`}
                        style={{ width: `${stats[key]}%` }}
                      />
                    </div>
                  </div>
                ))}
                <p className="text-zinc-500 italic text-xs pt-3 border-t border-white/10 text-center">
                  {stats.ability}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 py-10 text-zinc-600">
            <span style={{ fontSize: 48 }}>🃏</span>
            <p className="text-sm">Hit draw to summon a card</p>
          </div>
        )}
      </div>

      {isCooldown && (
        <p className="text-sm text-zinc-400">
          Cooldown: <span className="font-semibold">{formatTime(timeLeft)}</span>
        </p>
      )}

      <button
        onClick={draw}
        disabled={isCooldown}
        className={`px-8 py-3 rounded-xl font-semibold text-sm transition-all
          ${
            isCooldown
              ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
              : "bg-white text-black hover:bg-zinc-200 active:scale-95"
          }`}
      >
        {isCooldown ? `Wait ${formatTime(timeLeft)}` : card ? "Draw Again" : "Draw Card"}
      </button>
    </main>
  );
}