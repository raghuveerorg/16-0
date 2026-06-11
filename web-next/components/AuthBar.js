"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function AuthBar() {
  const supabase = supabaseBrowser();
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

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

  const bar = { display: "flex", justifyContent: "flex-end", gap: 8, alignItems: "center", padding: "10px 16px", maxWidth: 760, margin: "0 auto" };
  const link = { color: "#ffb020", textDecoration: "none", fontWeight: 700, fontSize: 14 };
  const input = { width: "100%", padding: "9px 10px", margin: "4px 0", borderRadius: 8, border: "1px solid #2c3563", background: "#10152e", color: "#eaf0ff" };

  if (user) {
    return (
      <div style={bar}>
        <a href="/leaderboard" style={link}>Leaderboard</a>
        <a href="/profile" style={link}>My streak & history</a>
        <button className="btn ghost sm" onClick={signOut}>Sign out</button>
      </div>
    );
  }

  return (
    <div style={bar}>
      <a href="/leaderboard" style={link}>Leaderboard</a>
      <button className="btn sm" onClick={() => setOpen((o) => !o)}>Sign in</button>
      {open && (
        <div style={{ position: "absolute", top: 52, right: 16, width: 290, background: "#1b2240", border: "1px solid #2c3563", borderRadius: 14, padding: 16, zIndex: 50 }}>
          <button className="btn sm" style={{ width: "100%", marginBottom: 12 }} onClick={() => oauth("google")}>Continue with Google</button>

          <div style={{ color: "#9aa6cf", fontSize: 12, margin: "6px 0" }}>or email me a sign-in link</div>
          <input style={input} type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn sm" style={{ width: "100%" }} onClick={sendEmail}>Email me a magic link</button>

          {msg && <div style={{ color: "#9aa6cf", fontSize: 12, marginTop: 10 }}>{msg}</div>}
        </div>
      )}
    </div>
  );
}
