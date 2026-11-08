// Coverage badge: how many of the six score categories have data for a model. Server-safe.
import { CATEGORIES, type CategoryScores } from "@/lib/score";

export function coverageOf(cats: CategoryScores) {
  const have = CATEGORIES.filter((c) => cats[c.id] != null);
  const missing = CATEGORIES.filter((c) => cats[c.id] == null);
  return { n: have.length, total: CATEGORIES.length, missing: missing.map((c) => c.label) };
}

export function coverageText(cats: CategoryScores) {
  const c = coverageOf(cats);
  return c.missing.length ? `Data in ${c.n} of ${c.total} categories. Missing: ${c.missing.join(", ")}.` : `Data in all ${c.total} categories.`;
}

/** Six small segments, filled where a category has data. */
export function CoverageDots({ cats, label = false }: { cats: CategoryScores; label?: boolean }) {
  const c = coverageOf(cats);
  const t = coverageText(cats);
  return (
    <span className="cov" title={t} role="img" aria-label={t}>
      <span className="cov-dots" aria-hidden="true">
        {CATEGORIES.map((k) => (
          <span key={k.id} className={cats[k.id] != null ? "on" : ""} />
        ))}
      </span>
      {label && <span className="cov-n" aria-hidden="true">{c.n}/{c.total}</span>}
    </span>
  );
}

/** Larger badge for the model page: share, segments and the names of missing categories. */
export function CoverageBadge({ cats }: { cats: CategoryScores }) {
  const c = coverageOf(cats);
  const full = c.missing.length === 0;
  return (
    <div className="cov-badge">
      <span className={`cov-pill ${full ? "full" : ""}`}>
        <CoverageDots cats={cats} />
        <b>{Math.round((c.n / c.total) * 100)}% coverage</b>
        <span>{c.n} of {c.total} categories</span>
      </span>
      <span className="cov-miss">{full ? "Every category has data." : <>Missing: {c.missing.join(", ")}. Missing means no data yet, never a zero.</>}</span>
    </div>
  );
}
