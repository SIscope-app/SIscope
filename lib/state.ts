/**
 * Facts for /state-of-ai and the homepage strip. Every number comes from the
 * snapshot passed in. There is no price history, so that series is absent.
 */
import { fmtInOut } from "./format";
import { CATEGORIES, type CategoryId, type CategoryScores, type Components } from "./score";

export type StateModel = {
  slug: string;
  name: string;
  base: string;
  org: string;
  open: boolean;
  si: number | null;
  siRank: number | null;
  cats: CategoryScores;
  comp: Components;
  price: { blended_per_m: number; input_per_m: number; output_per_m: number; as_of: string } | null;
  textDate: string | null;
  historyText: [string, number, number][];
  historyWeb: [string, number, number][];
};

export type GapPoint = { d: string; closed: number; open: number; closed_name: string; open_name: string };

export type StateFact = {
  id: string;
  kicker: string;
  title: string;
  href: string;
  source: string;
  date: string;
};

export type RankMove = StateFact & { places: number; direction: "up" | "down" };

export type StateReport = {
  asOf: string;
  overall: StateFact | null;
  jobs: StateFact[];
  openModel: StateFact | null;
  gap: { now: number; then: number; thenDate: string; series: GapPoint[]; source: string; date: string; closedName: string; openName: string } | null;
  nearTop: StateFact | null;
  /** No stored price history, so this stays empty. */
  frontierPrice: null;
  releases: StateFact[];
  movers: RankMove[];
  lab: StateFact | null;
  glance: StateFact[];
};

const JOBS: CategoryId[] = ["coding", "agents", "reasoning", "math", "chat"];

function measured(m: Pick<StateModel, "comp">, id: CategoryId): boolean {
  const cat = CATEGORIES.find((c) => c.id === id);
  return !!cat && cat.components.some((k) => typeof m.comp[k.id] === "number");
}

function dayShift(iso: string, days: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  const mm = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(utc.getUTCDate()).padStart(2, "0");
  return `${utc.getUTCFullYear()}-${mm}-${dd}`;
}

function firstDate(m: StateModel): string | null {
  const dates = [...m.historyText, ...m.historyWeb].map((p) => p[0]).sort();
  return dates[0] ?? null;
}

function fact(partial: StateFact): StateFact {
  return partial;
}

export function toStateModel(m: {
  slug: string;
  name: string;
  base: string;
  org: string;
  open: boolean;
  si: number | null;
  siRank: number | null;
  cats: CategoryScores;
  comp: Components;
  price: { blended_per_m: number; input_per_m: number; output_per_m: number; as_of: string } | null;
  arena: { text?: { date: string }; webdev?: { date: string } };
  history: { text?: [string, number, number][]; webdev?: [string, number, number][] };
}): StateModel {
  return {
    slug: m.slug,
    name: m.name,
    base: m.base,
    org: m.org,
    open: m.open,
    si: m.si,
    siRank: m.siRank,
    cats: m.cats,
    comp: m.comp,
    price: m.price,
    textDate: m.arena.text?.date ?? m.arena.webdev?.date ?? null,
    historyText: m.history.text ?? [],
    historyWeb: m.history.webdev ?? [],
  };
}

export function modelSummary(m: Pick<StateModel, "siRank" | "cats" | "comp" | "price" | "open">): string {
  const rank = m.siRank != null ? `Ranks #${m.siRank} overall` : "No overall rank";
  let best: { label: string; v: number } | null = null;
  for (const c of CATEGORIES) {
    if (!measured(m, c.id) || m.cats[c.id] == null) continue;
    if (!best || m.cats[c.id]! > best.v) best = { label: c.short.toLowerCase(), v: m.cats[c.id]! };
  }
  const at = best ? `best at ${best.label}` : "no category measured";
  const price = m.price ? fmtInOut(m.price.input_per_m, m.price.output_per_m) : "no list price";
  return `${rank}; ${at}; ${price}; open weights: ${m.open ? "yes" : "no"}.`;
}

export function buildState(models: StateModel[], gap: GapPoint[], asOf: string, orgLabel: (org: string) => string = (org) => org): StateReport {
  const ranked = models.filter((m) => m.si != null).sort((a, b) => b.si! - a.si! || (a.siRank ?? 999) - (b.siRank ?? 999));
  const top = ranked[0] ?? null;
  const overall = top
    ? fact({ id: "overall", kicker: "Overall", title: top.name, href: `/models/${top.slug}`, source: "SIscope score", date: asOf })
    : null;

  const jobs = JOBS.flatMap((id) => {
    const cat = CATEGORIES.find((c) => c.id === id)!;
    const leader = models
      .filter((m) => measured(m, id) && m.cats[id] != null)
      .sort((a, b) => b.cats[id]! - a.cats[id]! || (b.si ?? 0) - (a.si ?? 0))[0];
    if (!leader) return [];
    return [fact({ id, kicker: cat.short, title: leader.name, href: `/models/${leader.slug}`, source: "SIscope score", date: leader.textDate || asOf })];
  });

  const open = ranked.filter((m) => m.open)[0] ?? null;
  const openModel = open
    ? fact({ id: "open", kicker: "Best open", title: open.name, href: `/models/${open.slug}`, source: "SIscope score", date: open.textDate || asOf })
    : null;

  const series = gap.filter((g) => Number.isFinite(g.closed) && Number.isFinite(g.open));
  const last = series.at(-1);
  const first = series[0];
  const gapReport = last && first
    ? {
        now: Math.round(last.closed) - Math.round(last.open),
        then: Math.round(first.closed) - Math.round(first.open),
        thenDate: first.d,
        series,
        source: "Arena text",
        date: last.d,
        closedName: last.closed_name,
        openName: last.open_name,
      }
    : null;

  let nearTop: StateFact | null = null;
  if (top?.si != null) {
    const close = ranked.filter((m) => m.price && top.si! - m.si! <= 5);
    const cheap = close.sort((a, b) => a.price!.blended_per_m - b.price!.blended_per_m || b.si! - a.si!)[0];
    if (cheap?.price) {
      nearTop = fact({
        id: "near",
        kicker: "Within 5 pts",
        title: `${cheap.name} · ${fmtInOut(cheap.price.input_per_m, cheap.price.output_per_m)}`,
        href: `/models/${cheap.slug}`,
        source: "OpenRouter list price",
        date: cheap.price.as_of.slice(0, 10),
      });
    }
  }

  const cutoff = dayShift(asOf, -30);
  const releases = ranked
    .map((m) => ({ m, debut: firstDate(m) }))
    .filter((x): x is { m: StateModel; debut: string } => !!x.debut && x.debut >= cutoff && x.debut <= asOf)
    .sort((a, b) => b.m.si! - a.m.si! || b.debut.localeCompare(a.debut))
    .slice(0, 5)
    .map(({ m, debut }) => fact({ id: `new-${m.slug}`, kicker: "New", title: m.name, href: `/models/${m.slug}`, source: "Arena history", date: debut }));

  const movers: RankMove[] = [];
  for (const m of models) {
    const points = m.historyText;
    if (points.length < 2) continue;
    const latest = points[points.length - 1];
    const target = dayShift(latest[0], -30);
    const earlier = [...points].reverse().find((p) => p[0] <= target);
    if (!earlier || earlier[0] === latest[0]) continue;
    const places = earlier[2] - latest[2];
    if (places === 0) continue;
    movers.push({
      id: `move-${m.slug}`,
      kicker: places > 0 ? "Up" : "Down",
      title: m.name,
      href: `/models/${m.slug}`,
      source: "Arena text",
      date: latest[0],
      places: Math.abs(places),
      direction: places > 0 ? "up" : "down",
    });
  }
  movers.sort((a, b) => b.places - a.places || a.title.localeCompare(b.title));

  const top10 = ranked.slice(0, 10);
  const counts = new Map<string, { org: string; n: number; best: number }>();
  for (const m of top10) {
    const row = counts.get(m.org) ?? { org: m.org, n: 0, best: m.siRank ?? 999 };
    row.n += 1;
    row.best = Math.min(row.best, m.siRank ?? 999);
    counts.set(m.org, row);
  }
  const labRow = [...counts.values()].sort((a, b) => b.n - a.n || a.best - b.best)[0];
  const lab = labRow
    ? fact({
        id: "lab",
        kicker: "Top 10",
        title: `${labRow.n} from ${orgLabel(labRow.org)}`,
        href: "/leaderboard",
        source: "SIscope score",
        date: asOf,
      })
    : null;

  const gapFact = gapReport
    ? fact({ id: "gap", kicker: "Open gap", title: `${gapReport.now} pts`, href: "/state-of-ai#gap", source: "Arena text", date: gapReport.date })
    : null;
  const glance = [overall, openModel, gapFact, nearTop, lab].filter((x): x is StateFact => !!x).slice(0, 5);

  return { asOf, overall, jobs, openModel, gap: gapReport, nearTop, frontierPrice: null, releases, movers: movers.slice(0, 5), lab, glance };
}

export function stateFaqs(report: StateReport, labName: string | null): { q: string; a: string }[] {
  const faqs: { q: string; a: string }[] = [];
  if (report.overall) faqs.push({ q: "Which AI model is ranked first overall?", a: `${report.overall.title} leads the SIscope score in this snapshot (${report.overall.date}).` });
  for (const job of report.jobs) faqs.push({ q: `Which model leads ${job.kicker.toLowerCase()}?`, a: `${job.title} has the highest ${job.kicker.toLowerCase()} score (${job.date}).` });
  if (report.openModel) faqs.push({ q: "What is the best open-weight model?", a: `${report.openModel.title} has the highest SIscope score among models with downloadable weights.` });
  if (report.gap) faqs.push({ q: "How far behind are open-weight models?", a: `On Arena text, the leading closed model leads the leading open model by ${report.gap.now} points as of ${report.gap.date}. That is a vote-score gap, not the SIscope score.` });
  if (report.nearTop) faqs.push({ q: "What is the cheapest model close to the top?", a: `${report.nearTop.title} is the lowest list price among models within 5 SIscope points of the leader.` });
  if (labName && report.lab) faqs.push({ q: "Which lab has the most models in the top 10?", a: `${labName} has ${report.lab.title.split(" ")[0]} of the ten highest SIscope scores.` });
  faqs.push(
    { q: "What is an Arena Elo?", a: "An Arena Elo is a rating from blind pairwise votes. A higher number means people preferred that model's answers more often. It is not a percent, and two ratings a few points apart can be a tie once the uncertainty range is included." },
    { q: "What is a percentile?", a: "A percentile says how many results in a comparison group were lower. A 90 means better than about 90 percent of that group. It is not the raw test score." },
    { q: "What does coverage mean?", a: "Coverage is how much of the score has a real measurement behind it. A missing test is left out. It is not counted as zero, and it is not filled with the model's own best number." },
    { q: "What is a blended price?", a: "A blended price turns separate input and output list prices into one number by assuming three input tokens for each output token. The input and output prices are the underlying facts." },
  );
  return faqs;
}
