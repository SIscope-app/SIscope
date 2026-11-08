import { og } from "@/lib/site";
import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, OpenTag } from "@/components/Avatar";
import { Icon } from "@/components/Icons";
import { TASKS, taskRanking } from "@/lib/tasks";

export const metadata: Metadata = {
  title: "Best AI for every task",
  description: "The best AI model for coding, writing, math, images, agents, open weights and low cost, picked from human votes and independent tests.",
  alternates: { canonical: "/best" }, openGraph: og("/best"),
};

export default function Page() {
  return (
    <div className="wrap">
      <div className="page-head">
        <div className="eyebrow">Best for…</div>
        <h1 className="h1" style={{ marginTop: 8 }}>The best AI for what you want to do</h1>
        <p className="lede">One winner per task, plus the runners-up and the best open option.</p>
      </div>
      <div className="grid3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
        {TASKS.map((t) => {
          const r = taskRanking(t).slice(0, 3);
          return (
            <Link key={t.slug} href={`/best/${t.slug}`} className="card task" style={{ padding: 20, gap: 10 }}>
              <span className="tl">
                <Icon name={t.icon} /> {t.label}
              </span>
              <span className="alt">{t.intro}</span>
              {t.soon ? (
                <span className="soon" style={{ alignSelf: "flex-start" }}>Coming soon</span>
              ) : (
                <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
                  {r.map(({ m }, i) => (
                    <li key={m.slug} className="nm" style={{ fontSize: 14.5 }}>
                      <span className="tnum" style={{ color: i ? "var(--faint)" : "var(--accent)", width: 14, fontWeight: 700 }}>{i + 1}</span>
                      <Avatar org={m.org} size={20} />
                      <span className="n" title={m.name}>{m.base}</span>
                      <OpenTag open={m.open} />
                    </li>
                  ))}
                </ol>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
