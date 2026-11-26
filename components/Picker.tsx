"use client";
import { useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { USE_CASES, advise, type AdviseRow, type UseId } from "@/lib/picker";
import { ScoreNote } from "./ScoreNote";

function isUse(value: string | null): value is UseId {
  return USE_CASES.some((u) => u.id === value);
}

export function Picker({ models }: { models: AdviseRow[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const rawUse = params.get("use");
  const use: UseId = isUse(rawUse) ? rawUse : "general";
  const quality = Math.min(100, Math.max(0, Number(params.get("q") ?? "100") || 0));
  const result = useMemo(() => advise(models, { use, quality }), [models, use, quality]);

  const set = (nextUse: UseId, nextQuality: number) => {
    const q = new URLSearchParams(params.toString());
    q.set("use", nextUse);
    q.set("q", String(nextQuality));
    router.replace(`${path}?${q.toString()}`, { scroll: false });
  };

  return (
    <div className="card" style={{ padding: 20, display: "grid", gap: 16 }}>
      <div className="filters">
        <label style={{ display: "grid", gap: 4, fontSize: 12.5, color: "var(--muted)", fontWeight: 560 }}>
          Use
          <select className="select" value={use} onChange={(e) => { if (isUse(e.target.value)) set(e.target.value, quality); }} aria-label="Use">
            {USE_CASES.map((u) => (
              <option key={u.id} value={u.id}>{u.label}</option>
            ))}
          </select>
        </label>
        <label style={{ display: "grid", gap: 6, fontSize: 12.5, color: "var(--muted)", fontWeight: 560, minWidth: 220 }}>
          Cost to quality: {quality}
          <input type="range" min={0} max={100} value={quality} aria-label="Quality versus cost" onChange={(e) => set(use, Number(e.target.value))} />
        </label>
      </div>
      {!result.primary ? (
        <p className="note" style={{ margin: 0 }}>{result.empty}</p>
      ) : (
        <>
          <article>
            <div className="eyebrow">Recommendation</div>
            <Link href={`/models/${result.primary.slug}`} className="decide-name">{result.primary.name}</Link>
            <p className="sub">{result.primary.why}</p>
          </article>
          {result.alternatives.length > 0 && (
            <div>
              <div className="eyebrow">Alternatives</div>
              <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
                {result.alternatives.map((alt) => (
                  <li key={alt.kind + alt.slug}>
                    <Link href={`/models/${alt.slug}`} className="link">{alt.name}</Link>
                    <p className="sub" style={{ margin: "2px 0 0" }}>{alt.kind === "cheaper" ? "Cheaper" : alt.kind === "open-weight" ? "Open-weight" : "Runner-up"}. {alt.line}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      <ScoreNote />
    </div>
  );
}
