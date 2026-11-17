/**
 * Prerender Open Graph PNGs into public/og. The Next server does not import next/og,
 * so the Cloudflare worker does not carry the resvg font and wasm.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { ImageResponse } from "next/og";
import { allModels, siRanked } from "../lib/data";
import { fmtPrice } from "../lib/format";
import { popularMatchups } from "../lib/matchups";
import { orgName } from "../lib/orgs";
import { CATEGORIES } from "../lib/score";
import { OgFrame, OG_SIZE } from "../components/og";

async function png(node: React.ReactElement, file: string) {
  const res = new ImageResponse(node, { ...OG_SIZE });
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, buf);
}

function homeCard() {
  const top = siRanked().slice(0, 5);
  return (
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
  );
}

function modelCard(slug: string) {
  const m = allModels().find((x) => x.slug === slug)!;
  const c = m.open ? "#e69f00" : "#7cc4f5";
  return (
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
  );
}

function pairCard(left: string, right: string) {
  const a = allModels().find((m) => m.slug === left);
  const b = allModels().find((m) => m.slug === right);
  const line = (name: string, score: number | null | undefined, color: string) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 24 }}>
      <div style={{ display: "flex", fontSize: 40, fontWeight: 750 }}>{name}</div>
      <div style={{ display: "flex", fontSize: 64, fontWeight: 800, color }}>{score == null ? "n/a" : score.toFixed(0)}</div>
    </div>
  );
  return (
    <OgFrame kicker="Compare">
      <div style={{ display: "flex", flexDirection: "column", gap: 28, marginTop: 48 }}>
        {line(a?.name ?? "Model", a?.si, "#7cc4f5")}
        <div style={{ display: "flex", fontSize: 28, color: "#a3afbd" }}>versus</div>
        {line(b?.name ?? "Model", b?.si, "#e69f00")}
      </div>
    </OgFrame>
  );
}

async function main() {
  const root = join(process.cwd(), "public", "og");
  await png(homeCard(), join(root, "home.png"));
  let n = 1;
  for (const m of allModels()) {
    await png(modelCard(m.slug), join(root, "models", `${m.slug}.png`));
    n++;
  }
  for (const pair of popularMatchups(siRanked())) {
    await png(pairCard(pair.left, pair.right), join(root, "compare", `${pair.key}.png`));
    n++;
  }
  console.log(`wrote ${n} og images`);
}

main();
