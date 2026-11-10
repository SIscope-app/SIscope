import { ImageResponse } from "next/og";
import { OG_SIZE, OgFrame } from "@/components/og";
import { siRanked } from "@/lib/data";

export const alt = "SIscope: see which AI is best, at a glance";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  const top = siRanked().slice(0, 5);
  return new ImageResponse(
    (
      <OgFrame kicker="Free AI model tracker">
        <div style={{ display: "flex", fontSize: 68, fontWeight: 800, marginTop: 44, letterSpacing: -2, lineHeight: 1.05 }}>See which AI is best, at a glance.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 40 }}>
          {top.map((m, i) => (
            <div key={m.slug} style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 28 }}>
              <div style={{ display: "flex", width: 30, color: i ? "#7d8a9a" : "#7cc4f5", fontWeight: 800 }}>{i + 1}</div>
              <div style={{ width: 460, fontWeight: 650, display: "flex" }}>{m.variant ? `${m.base} · ${m.variant}` : m.base}</div>
              <div style={{ display: "flex", flex: 1, height: 18, background: "#223040", borderRadius: 9 }}>
                <div style={{ display: "flex", width: `${((m.si! - 50) / 50) * 100}%`, background: m.open ? "#e69f00" : "#7cc4f5", borderRadius: 9 }} />
              </div>
              <div style={{ display: "flex", width: 60, textAlign: "right", fontWeight: 800, justifyContent: "flex-end" }}>{m.si!.toFixed(0)}</div>
            </div>
          ))}
        </div>
      </OgFrame>
    ),
    size,
  );
}
