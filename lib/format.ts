export function fmtDate(s: string | null | undefined, opts: { year?: boolean } = { year: true }): string {
  if (!s) return "n/a";
  const d = new Date(s.length === 10 ? s + "T12:00:00Z" : s);
  if (Number.isNaN(d.getTime())) return "n/a";
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", ...(opts.year ? { year: "numeric" } : {}), timeZone: "UTC" });
}

/** Full UTC time for the last successful site update. Source as-of dates use fmtDate. */
export function fmtDateTime(s: string | null | undefined): string {
  if (!s) return "n/a";
  const d = new Date(s.length === 10 ? s + "T12:00:00Z" : s);
  if (Number.isNaN(d.getTime())) return "n/a";
  const date = d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });
  return `${date}, ${time} UTC`;
}

function dollar(v: number, body: string): string {
  return `${v < 0 ? "-" : ""}$${body}`;
}

/**
 * Full list price. $0 stays $0. At least two decimal places, and digits past
 * the cent through four places when the price is not an even cent ($0.025, $1.2505).
 * Use this in detail lines, tooltips and the cost calculator.
 */
export function fmtPriceExact(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "n/a";
  if (v === 0) return "$0";
  const fixed = Math.abs(v).toFixed(4).replace(/0+$/, "");
  const [whole, frac = ""] = fixed.split(".");
  return dollar(v, `${whole}.${frac.padEnd(2, "0")}`);
}

/**
 * Headline list price. Two decimal places ($0.54, $0.10, $8.00). Amounts under
 * $0.01 keep the extra digits so they do not collapse to $0.00.
 */
export function fmtPrice(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "n/a";
  if (v === 0) return "$0";
  if (Math.abs(v) < 0.01) return fmtPriceExact(v);
  return dollar(v, Math.abs(v).toFixed(2));
}

export function fmtInt(v: number | null | undefined): string {
  return v == null ? "n/a" : Math.round(v).toLocaleString("en-US");
}

export function fmtCtx(v: number | null | undefined): string {
  if (!v) return "n/a";
  if (v >= 1_000_000) return `${+(v / 1_000_000).toFixed(1)}M`;
  return `${Math.round(v / 1000)}K`;
}

export function fmtPct(v: number | null | undefined, digits = 0): string {
  return v == null ? "n/a" : `${(v * 100).toFixed(digits)}%`;
}
