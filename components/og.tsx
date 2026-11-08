// Shared building blocks for Open Graph images (rendered by next/og, inline styles only).
export const OG_SIZE = { width: 1200, height: 630 };

export function OgFrame({ children, kicker }: { children: React.ReactNode; kicker?: string }) {
  return (
    <div style={{ display: "flex", width: "100%", height: "100%", flexDirection: "column", background: "#0f141b", color: "#e7ebf0", padding: "56px 64px", fontFamily: "sans-serif", backgroundImage: "radial-gradient(900px 400px at 0% 0%, rgba(124,196,245,0.18), transparent 60%)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <svg width="56" height="56" viewBox="0 0 64 64">
          <rect width="64" height="64" rx="16" fill="#18202b" />
          <circle cx="28" cy="28" r="17" fill="none" stroke="#7cc4f5" strokeWidth="5" />
          <path d="M41 41l11 11" stroke="#7cc4f5" strokeWidth="6" strokeLinecap="round" />
          <rect x="18" y="28" width="5" height="9" rx="2" fill="#e69f00" />
          <rect x="25.5" y="23" width="5" height="14" rx="2" fill="#7cc4f5" />
          <rect x="33" y="18" width="5" height="19" rx="2" fill="#7cc4f5" />
        </svg>
        <div style={{ display: "flex", fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>SIscope</div>
        {kicker && <div style={{ display: "flex", marginLeft: "auto", fontSize: 24, color: "#7cc4f5", fontWeight: 700 }}>{kicker}</div>}
      </div>
      {children}
    </div>
  );
}
