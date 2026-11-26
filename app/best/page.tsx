import { og } from "@/lib/site";
import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, OpenTag } from "@/components/Avatar";
import { Icon } from "@/components/Icons";
import { ensureData } from "@/lib/data";
import { TASKS, taskRanking } from "@/lib/tasks";

export const metadata: Metadata = {
  title: "Best for",
  description: "The leading model for coding, writing, math, images, agents, open weights and a low list price.",
  alternates: { canonical: "/best" }, openGraph: og("/best"),
};

export default async function Page() {
  await ensureData();
  return (
    <div className="wrap">
      <div className="page-head">
        <div className="eyebrow">Best for…</div>
        <h1 className="h1" style={{ marginTop: 8 }}>A winner for each job</h1>
        <p className="lede">One leading model per job, the next two, and the leading open-weight option.</p>
      </div>
      <div className="task-grid">
        {TASKS.map((t) => {
          const r = taskRanking(t).slice(0, 3);
          return (
            <Link key={t.slug} href={`/best/${t.slug}`} className="card task" style={{ padding: 20, gap: 10 }}>
              <span className="tl">
                <Icon name={t.icon} /> {t.label}
              </span>
              <span className="alt">{t.intro}</span>
              {t.soon ? (
                <span className="soon" style={{ alignSelf: "flex-start" }}>Not measured yet</span>
              ) : (
                <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
                  {r.map(({ m }, i) => (
                    <li key={m.slug} className="nm" style={{ fontSize: 14.5 }}>
                      <span className="tnum" style={{ color: i ? "var(--faint)" : "var(--accent)", width: 14, fontWeight: 700 }}>{i + 1}</span>
                      <Avatar org={m.org} size={20} />
                      <span className="n">{m.name}</span>
                      <OpenTag open={m.open} />
                      {m.si != null ? <span className="tnum" style={{ color: "var(--muted)" }}>{m.si.toFixed(0)}</span> : null}
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
