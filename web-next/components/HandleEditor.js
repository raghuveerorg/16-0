"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

// Lets a signed-in user pick their leaderboard name (profiles RLS allows updating own row).
export default function HandleEditor({ userId, handle }) {
  const router = useRouter();
  const [value, setValue] = useState(handle ?? "");
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState("");

  const save = async () => {
    const v = value.trim();
    if (!/^[A-Za-z0-9_]{3,20}$/.test(v)) return setMsg("3–20 letters, numbers or _");
    const { error } = await supabaseBrowser().from("profiles").update({ handle: v }).eq("id", userId);
    if (error) return setMsg(error.code === "23505" ? "That name is taken — try another." : error.message);
    setMsg(""); setEditing(false); router.refresh();
  };

  const input = { padding: "8px 10px", borderRadius: 8, border: "1px solid #2c3563", background: "#10152e", color: "#eaf0ff", fontSize: 14, width: 200 };

  if (!editing) {
    return (
      <p style={{ fontSize: 15 }}>
        Leaderboard name: <b style={{ color: "#ffb020" }}>{handle ?? "—"}</b>{" "}
        <button className="btn ghost sm" style={{ marginLeft: 8, padding: "5px 11px", fontSize: 12, borderRadius: 8, border: "1px solid #2c3563", background: "transparent", color: "#eaf0ff", cursor: "pointer", fontWeight: 700 }}
          onClick={() => setEditing(true)}>Change</button>
      </p>
    );
  }

  return (
    <p style={{ fontSize: 15, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <input style={input} value={value} maxLength={20} onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()} aria-label="Leaderboard name" />
      <button style={{ padding: "8px 14px", borderRadius: 8, border: 0, background: "linear-gradient(90deg,#ff5a36,#ffb020)", color: "#180a06", fontWeight: 800, cursor: "pointer" }} onClick={save}>Save</button>
      <button style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #2c3563", background: "transparent", color: "#9aa6cf", cursor: "pointer" }} onClick={() => { setEditing(false); setValue(handle ?? ""); setMsg(""); }}>Cancel</button>
      {msg && <span style={{ color: "#ff5a5a", fontSize: 12 }}>{msg}</span>}
    </p>
  );
}
