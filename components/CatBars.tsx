import { CATEGORIES, type CategoryScores } from "@/lib/score";

export function CatBars({ cats, open }: { cats: CategoryScores; open?: boolean }) {
  return (
    <div>
      {CATEGORIES.map((c) => {
        const v = cats[c.id];
        return (
          <div key={c.id} className="catbar" title={c.blurb}>
            <span className="l">{c.label}</span>
            {v == null ? (
              <span className="nodata" style={{ fontSize: 13 }}>
                No data yet
              </span>
            ) : (
              <span className="barw">
                <span className={`bar ${open ? "open" : ""}`} style={{ width: `${Math.max(3, v)}%` }} />
              </span>
            )}
            <span className="v" title={v == null ? "No result yet. Not a zero." : undefined}>{v == null ? "n/a" : Math.round(v)}</span>
          </div>
        );
      })}
    </div>
  );
}
