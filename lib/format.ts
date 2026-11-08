export function fmtDate(s: string | null | undefined, opts: { year?: boolean } = { year: true }): string {
  if (!s) return "n/a";
  const d = new Date(s.length === 10 ? s + "T12:00:00Z" : s);
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", ...(opts.year ? { year: "numeric" } : {}), timeZone: "UTC" });
}

export function fmtPrice(v: number | null | undefined): string {
  if (v == null) return "n/a";
  if (v === 0) return "$0";
  if (v < 0.1) return "$" + v.toFixed(3).replace(/0+$/, "");
  if (v < 10) return "$" + v.toFixed(2).replace(/\.?0+$/, "");
  return "$" + v.toFixed(0);
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
