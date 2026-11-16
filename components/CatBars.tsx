import { categorySources } from "@/lib/trust";
import { CATEGORIES, type CategoryId, type CategoryScores, type Components } from "@/lib/score";

export function CatBars({ cats, open, comp, imputed = [] }: { cats: CategoryScores; open?: boolean; comp?: Components; imputed?: CategoryId[] }) {
  return (
    <div>
      {CATEGORIES.map((c) => {
        const v = cats[c.id];
        const sources = comp ? categorySources(comp, c.id) : null;
        const filled = v == null && imputed.includes(c.id);
        const single = sources?.n === 1;
        return (
          <div key={c.id} className="catbar" title={c.blurb}>
            <span className="l">{c.label}</span>
            {v == null ? (
              <span className="nodata" style={{ fontSize: 13 }} title={filled ? "This category has no result. The overall score fills it with this model's weakest measured category." : "No result yet. Not a zero."}>
                {filled ? "Not measured · filled from weakest" : "No data yet"}
              </span>
            ) : (
              <span className="barw">
                <span className={`bar ${open ? "open" : ""}`} style={{ width: `${Math.max(3, v)}%` }} />
              </span>
            )}
            <span className="v" title={single ? `Single source: ${sources!.only}` : v == null ? "No result yet. Not a zero." : undefined}>
              {v == null ? "n/a" : Math.round(v)}
              {single ? <span className="cov-n"> single source</span> : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}
