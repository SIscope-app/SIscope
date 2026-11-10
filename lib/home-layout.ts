import { fmtPrice } from "./format";

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
      headline: `${fmtPrice(blended)} /1M`,
      detail: `${fmtPrice(input)} in · ${fmtPrice(output)} out · new list price`,
    };
  }
  return { mode: "new", headline: "New list price", detail: sub };
}
