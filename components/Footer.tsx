import Link from "next/link";
import { PUBLISH, SOURCES } from "@/lib/data";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { SCORE_VERSION } from "@/lib/score";
import { LogoMark } from "./Logo";
import { Donations } from "./Donations";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap" style={{ display: "grid", gap: 28 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 28, justifyContent: "space-between" }}>
          <div style={{ maxWidth: 360 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 750, fontSize: 18, color: "var(--text)" }}>
              <LogoMark size={28} /> SIscope
            </div>
            <p style={{ margin: "10px 0 0" }}>An independent ranking of AI models. No account. No paid placement.</p>
            <p style={{ margin: "8px 0 0" }}>
              <Link href="/methodology">Score v{SCORE_VERSION}</Link> · <Link href="/about">About</Link> ·{" "}
              <a href="/api/v0/models.json">JSON snapshot</a>
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: "6px 28px", minWidth: 280 }}>
            {[
              ["/leaderboard", "Full ranking"],
              ["/compare", "Compare"],
              ["/tools/cost", "Monthly cost"],
              ["/best/coding", "Coding"],
              ["/best/open", "Open weights"],
              ["/best/cheap", "Under $1"],
              ["/agents", "Agents"],
            ].map(([h, l]) => (
              <Link key={h} href={h} className="foot-link" style={{ color: "var(--muted)" }}>
                {l}
              </Link>
            ))}
          </div>
        </div>
        <div id="sources">
          <div style={{ color: "var(--text)", fontWeight: 650, marginBottom: 6 }}>Sources and licences</div>
          <p style={{ margin: "0 0 8px" }}>
            <time dateTime={PUBLISH.last_success_at}>{fmtDateTime(PUBLISH.last_success_at)}</time> is the last refresh that deployed and passed its checks. Each source below has its own data as of date, which can be earlier.
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
            {SOURCES.sources.map((s) => (
              <li key={s.id}>
                <a href={s.url} rel="noopener">
                  {s.name}
                </a>{" "}
                · {s.license_url ? <a href={s.license_url} rel="noopener license">{s.license}</a> : s.license} · {s.used_for.split(";")[0].split(".")[0]}. Data as of {fmtDate(s.as_of)}, fetched {fmtDate(s.fetched_at)} (UTC).
              </li>
            ))}
          </ul>
          <p style={{ margin: "10px 0 0", color: "var(--faint)" }}>
            SIscope is not affiliated with a model maker or a data source. Speed is omitted until our own measurements exist. Artificial Analysis data is not used.
          </p>
        </div>
        <Donations />
      </div>
    </footer>
  );
}
