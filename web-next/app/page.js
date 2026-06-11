"use client";
import { useEffect, useRef } from "react";
import { GAME_BODY } from "@/lib/gameHtml";
import { submitDaily, submitFreeplay, fetchDailyStatus } from "@/lib/submit";

// Mounts the proven vanilla game (engine/players/app) and wires the Daily-result hook to the backend.
export default function GamePage() {
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    window.__onDailyResult__ = (p) => submitDaily(p).catch(() => null);
    window.__onGameResult__ = (p) => submitFreeplay(p).catch(() => null);
    const load = (src) => new Promise((res) => {
      const s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = res; document.body.appendChild(s);
    });
    (async () => {
      // Server is the source of truth for "already played today". Fetch it BEFORE the game boots so a
      // signed-in user can't replay the Daily — and so a DIFFERENT user never inherits the previous
      // user's cached result/streak from this browser's local storage.
      const LS = "16-0-daily-v1";
      const status = await fetchDailyStatus().catch(() => null);
      if (status && status.authed) {
        if (status.played) {
          window.__dailyStatus__ = status;
          try {
            const today = new Date().toISOString().slice(0, 10);
            localStorage.setItem(LS, JSON.stringify({
              date: today, wins: status.wins, losses: status.losses, rank: null,
              xi: status.xi, captainId: status.captainId,
            }));
          } catch {}
        } else {
          // Signed in but hasn't played today → wipe any stale cache left by another user.
          window.__dailyStatus__ = null;
          try { localStorage.removeItem(LS); } catch {}
        }
      }
      await load("/game/players.js");
      await load("/game/engine.js");
      await load("/game/app.js");
    })();
  }, []);
  return <main dangerouslySetInnerHTML={{ __html: GAME_BODY }} />;
}
