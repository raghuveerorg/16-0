"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

function useTheme() {
  const [theme, setTheme] = useState("dark");
  useEffect(() => {
    // Read what the inline script already applied
    setTheme(document.documentElement.getAttribute("data-theme") || "dark");
  }, []);
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("16-0-theme", next); } catch {}
    setTheme(next);
  };
  return { theme, toggle };
}

export default function AuthBar() {
  const supabase = supabaseBrowser();
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const { theme, toggle } = useTheme();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []); // eslint-disable-line

  const redirectTo = typeof window !== "undefined" ? window.location.origin + "/auth/callback" : undefined;
  const oauth = (provider) => supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
  const sendEmail = async () => {
    if (!email) return setMsg("Enter your email first.");
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    setMsg(error ? error.message : "Check your email for the sign-in link.");
  };
  const signOut = async () => {
    // Drop this browser's cached Daily so the next user doesn't inherit it.
    try { localStorage.removeItem("16-0-daily-v1"); } catch {}
    if (typeof window !== "undefined") window.__dailyStatus__ = null;
    await supabase.auth.signOut();
  };

  const bar = { display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", padding: "10px 16px", maxWidth: 760, margin: "0 auto" };
  const link = { color: "var(--acc2)", textDecoration: "none", fontWeight: 700, fontSize: 14 };
  const logoEl = (
    <a href="/" aria-label="16-0 home" style={{ display: "flex", alignItems: "center", textDecoration: "none", flexShrink: 0 }}>
      <img src="/logo.png" alt="Draft your All Time T20 Team" width={38} height={38} style={{ borderRadius: 6 }} />
    </a>
  );
  const navLinks = { display: "flex", gap: 8, alignItems: "center" };
  const input = { width: "100%", padding: "9px 10px", margin: "4px 0", borderRadius: 8, border: "1px solid var(--line)", background: "var(--card2)", color: "var(--txt)" };

  const themeBtn = (
    <button className="theme-toggle" onClick={toggle} aria-label="Toggle light/dark theme" title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );

  if (user) {
    return (
      <div style={bar}>
        {logoEl}
        <div style={navLinks}>
          <a href="/how-to-play" style={link}>How to Play</a>
          <a href="/leaderboard" style={link}>Leaderboard</a>
          <a href="/profile" style={link}>Streak</a>
          {themeBtn}
          <button className="btn ghost sm" onClick={signOut}>Sign out</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...bar, position: "relative" }}>
      {logoEl}
      <div style={navLinks}>
      <a href="/how-to-play" style={link}>How to Play</a>
      {themeBtn}
      <button className="btn sm" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="dialog">Sign in</button>
      {open && (
        <>
          {/* click-away scrim */}
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(5,8,20,.55)" }} />
          <div role="dialog" aria-label="Sign in" style={{ position: "absolute", top: 52, right: 16, width: 300, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, padding: 16, zIndex: 50, boxShadow: "0 18px 50px rgba(0,0,0,.5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: "var(--txt)" }}>Sign in to 16-0</div>
              <button onClick={() => setOpen(false)} aria-label="Close sign-in"
                style={{ background: "none", border: 0, color: "var(--mut)", fontSize: 18, cursor: "pointer", padding: "2px 6px", lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ color: "var(--mut)", fontSize: 12, marginBottom: 12 }}>Save your daily streak, climb the leaderboards and pick your player name.</div>
            <button className="btn sm" style={{ width: "100%", marginBottom: 12 }} onClick={() => oauth("google")}>Continue with Google</button>

            <div style={{ color: "#9aa6cf", fontSize: 12, margin: "6px 0" }}>or email me a sign-in link</div>
            <input style={input} type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendEmail()} />
            <button className="btn sm" style={{ width: "100%" }} onClick={sendEmail}>Email me a magic link</button>

            {msg && <div style={{ color: "#9aa6cf", fontSize: 12, marginTop: 10 }}>{msg}</div>}
          </div>
        </>
      )}
      </div>
    </div>
  );
}
