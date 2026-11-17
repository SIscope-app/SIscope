import { ImageResponse } from "next/og";
import { OG_SIZE, OgFrame } from "@/components/og";
import { modelBySlug, siRanked } from "@/lib/data";
import { matchupByKey, popularMatchups } from "@/lib/matchups";

export const alt = "Two models compared on SIscope";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return popularMatchups(siRanked()).map((p) => ({ pair: p.key }));
}

export default async function Image({ params }: { params: Promise<{ pair: string }> }) {
  const { pair } = await params;
  const hit = matchupByKey(siRanked(), pair);
  const a = hit ? modelBySlug(hit.left) : undefined;
  const b = hit ? modelBySlug(hit.right) : undefined;
  const line = (name: string, score: number | null, color: string) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 24 }}>
      <div style={{ display: "flex", fontSize: 40, fontWeight: 750 }}>{name}</div>
      <div style={{ display: "flex", fontSize: 64, fontWeight: 800, color }}>{score == null ? "n/a" : score.toFixed(0)}</div>
    </div>
  );
  return new ImageResponse(
    (
      <OgFrame kicker="Compare">
        <div style={{ display: "flex", flexDirection: "column", gap: 28, marginTop: 48 }}>
          {line(a?.name ?? "Model", a?.si ?? null, "#7cc4f5")}
          <div style={{ display: "flex", fontSize: 28, color: "#a3afbd" }}>versus</div>
          {line(b?.name ?? "Model", b?.si ?? null, "#e69f00")}
        </div>
      </OgFrame>
    ),
    OG_SIZE,
  );
}
