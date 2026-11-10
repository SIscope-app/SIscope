import { ImageResponse } from "next/og";
import { OG_SIZE, OgFrame } from "@/components/og";
import { allModels, modelBySlug } from "@/lib/data";
import { fmtPrice } from "@/lib/format";
import { orgName } from "@/lib/orgs";
import { CATEGORIES } from "@/lib/score";

export const alt = "Model scores on SIscope";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return allModels().map((m) => ({ slug: m.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const m = modelBySlug(slug)!;
  const c = m.open ? "#e69f00" : "#7cc4f5";
  return new ImageResponse(
    (
      <OgFrame kicker={m.open ? "Open weights" : orgName(m.org)}>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 36 }}>
          <div style={{ display: "flex", fontSize: m.name.length > 28 ? 46 : 58, fontWeight: 800, letterSpacing: -1.5 }}>{m.name}</div>
          <div style={{ fontSize: 28, color: "#a3afbd", marginTop: 6, display: "flex" }}>
            {orgName(m.org)}
            {m.price ? ` · ${fmtPrice(m.price.blended_per_m)} per 1M tokens` : " · No list price"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 48, marginTop: 40, alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 120, fontWeight: 800, lineHeight: 1, color: c }}>{m.si != null ? m.si.toFixed(0) : "n/a"}</div>
            <div style={{ display: "flex", fontSize: 24, color: "#a3afbd" }}>{m.si != null ? "SIscope score" : "Score coming"}</div>
          </div>
          <div style={{ display: "flex", flex: 1, gap: 18, alignItems: "flex-end", height: 200 }}>
            {CATEGORIES.map((k) => {
              const v = m.cats[k.id];
              return (
                <div key={k.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: 8 }}>
                  <div style={{ display: "flex", width: "100%", height: v == null ? 6 : Math.max(10, v * 1.6), background: v == null ? "#33445a" : c, borderRadius: 10, opacity: v == null ? 1 : 0.45 + v / 180 }} />
                  <div style={{ display: "flex", fontSize: 18, color: "#a3afbd" }}>{k.short}</div>
                </div>
              );
            })}
          </div>
        </div>
      </OgFrame>
    ),
    size,
  );
}
