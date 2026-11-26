import { fmtPrice, shownGap } from "./format";

/** How many change cards to show so the last row is full. */
export function visibleChangeCount(total: number, columns: number): number {
  if (total <= 0) return 0;
  const cols = Math.max(1, Math.floor(columns));
  if (cols === 1 || total <= cols) return total;
  return Math.floor(total / cols) * cols;
}

export type PriceChangeCopy = {
  mode: "new" | "changed";
  headline: string;
  detail: string;
};

const FROM_TO = /from\s+\$([0-9]*\.?[0-9]+)\s+to\s+\$([0-9]*\.?[0-9]+)/i;
const ARROW = /\$([0-9]*\.?[0-9]+)\s*(?:→|->|to)\s*\$([0-9]*\.?[0-9]+)/i;
const IN_OUT = /\$([0-9]*\.?[0-9]+)\s*in,\s*\$([0-9]*\.?[0-9]+)\s*out/i;

/** Price cards only state a change when the text has both prices. A first listing has no old price. */
export function priceChangeCopy(sub: string): PriceChangeCopy {
  const move = FROM_TO.exec(sub) ?? ARROW.exec(sub);
  if (move) {
    const prev = Number(move[1]);
    const next = Number(move[2]);
    const pct = prev > 0 ? Math.round(((next - prev) / prev) * 100) : null;
    const dir = next < prev ? "down" : next > prev ? "up" : "unchanged";
    const arrow = dir === "down" ? "↓" : dir === "up" ? "↑" : "→";
    const pctTxt = pct == null || dir === "unchanged" ? "" : ` ${pct > 0 ? "+" : ""}${pct}%`;
    return {
      mode: "changed",
      headline: `${fmtPrice(prev)} → ${fmtPrice(next)}`,
      detail: `${arrow} ${dir}${pctTxt}`,
    };
  }
  const io = IN_OUT.exec(sub);
  if (io) {
    const input = Number(io[1]);
    const output = Number(io[2]);
    const blended = (input * 3 + output) / 4;
    return {
      mode: "new",
      headline: `${fmtPrice(input)} in / ${fmtPrice(output)} out`,
      detail: `${fmtPrice(blended)} /1M blended · new list price`,
    };
  }
  return { mode: "new", headline: "New list price", detail: sub };
}

export type ChangeItem = { kind: string; date: string; text?: string; sub?: string };

/** Drop a gap card whose rounded points did not move. "was 47, now 47" is not an update. */
export function materialChanges<T extends ChangeItem>(changes: T[], gap: { closed: number; open: number }[]): T[] {
  if (gap.length < 2) return changes;
  const now = shownGap(gap[gap.length - 1].closed, gap[gap.length - 1].open);
  const prev = shownGap(gap[gap.length - 2].closed, gap[gap.length - 2].open);
  if (now !== prev) return changes;
  return changes.filter((c) => c.kind !== "gap");
}

/** The dates on the cards themselves, not the previous board snapshot. */
export function changeSpan(changes: { date: string }[]): { from: string; to: string } | null {
  const dates = changes.map((c) => c.date).filter(Boolean).sort();
  if (!dates.length) return null;
  return { from: dates[0], to: dates[dates.length - 1] };
}

/** Newest civil date among rank moves. Price listings are not rank moves. */
export function lastRankChange(changes: { kind: string; date: string }[]): string | null {
  const dates = changes.filter((c) => c.kind !== "price_new" && c.kind !== "price_cut").map((c) => c.date).filter(Boolean).sort();
  return dates.at(-1) ?? null;
}

export function changeRangeLabel(changes: { date: string }[], fmt: (iso: string) => string): string {
  const span = changeSpan(changes);
  if (!span) return "No updates in this snapshot.";
  const n = changes.length;
  const noun = n === 1 ? "update" : "updates";
  if (span.from === span.to) return `${n} ${noun} on ${fmt(span.from)}.`;
  return `${n} ${noun} from ${fmt(span.from)} to ${fmt(span.to)}.`;
}
