"use client";
import { useEffect, useRef } from "react";
import { GAME_BODY } from "@/lib/gameHtml";
import { submitDaily } from "@/lib/submit";

// Mounts the proven vanilla game (engine/players/app) and wires the Daily-result hook to the backend.
export default function GamePage() {
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    window.__onDailyResult__ = (p) => submitDaily(p).catch(() => null);
    const load = (src) => new Promise((res) => {
      const s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = res; document.body.appendChild(s);
    });
    (async () => {
      await load("/game/players.js");
      await load("/game/engine.js");
      await load("/game/app.js");
    })();
  }, []);
  return <main dangerouslySetInnerHTML={{ __html: GAME_BODY }} />;
}
