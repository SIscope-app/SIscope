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

/**
 * List price in US dollars. $0 stays $0. Every other price shows at least two
 * decimal places ($0.10, $0.50, $8.00). Digits past the cent are kept, through
 * four places, when the price is not an even cent ($0.025, $1.2505).
 */
export function fmtPrice(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "n/a";
  if (v === 0) return "$0";
  const sign = v < 0 ? "-" : "";
  const fixed = Math.abs(v).toFixed(4).replace(/0+$/, "");
  const [whole, frac = ""] = fixed.split(".");
  return `${sign}$${whole}.${frac.padEnd(2, "0")}`;
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
