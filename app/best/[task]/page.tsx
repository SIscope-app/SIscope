import { og } from "@/lib/site";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, OpenTag, VariantChip } from "@/components/Avatar";
import { Icon } from "@/components/Icons";
import { JsonLd } from "@/components/JsonLd";
import { BarRows } from "@/components/rows";
import { fmtPrice } from "@/lib/format";
import { orgName } from "@/lib/orgs";
import { TASKS, taskBySlug, taskRanking, CHEAP_MAX } from "@/lib/tasks";
import { textPublishDate } from "@/lib/data";
import { fmtDate } from "@/lib/format";

export const instant = false;

export function generateStaticParams() {
  return TASKS.map((t) => ({ task: t.slug }));
}

export async function generateMetadata({ params }: PageProps<"/best/[task]">): Promise<Metadata> {
  const { task } = await params;
  const t = taskBySlug(task);
  if (!t) return {};
  const w = taskRanking(t)[0]?.m;
  return {
    title: t.question.replace(/\?$/, "") + ` (${fmtDate(textPublishDate(), { year: false })})`,
    description: t.soon ? `${t.question} SIscope is building its own speed tests.` : `${t.question} Right now it's ${w?.name}. See the top 10, the best open option and why, from human votes and independent tests.`,
    alternates: { canonical: `/best/${t.slug}` }, openGraph: og(`/best/${t.slug}`),
  };
}

export default async function Page({ params }: PageProps<"/best/[task]">) {
  const { task } = await params;
  const t = taskBySlug(task);
  if (!t) notFound();
  const r = taskRanking(t);
  const top = r.slice(0, 10);
  const w = top[0]?.m;
  const bestOpen = r.find((x) => x.m.open && x.m !== w)?.m;
  const bestCheap = r.find((x) => x.m.price && x.m.price.blended_per_m <= CHEAP_MAX && x.m !== w)?.m;
  const disp = (v: number) => (t.scale === "elo" ? Math.round(v).toString() : v.toFixed(0));
  const vals = top.map((x) => x.v);
  const floor = t.scale === "elo" ? Math.floor((Math.min(...vals) - 30) / 10) * 10 : 50;
  const answer = w ? `${w.name} by ${orgName(w.org)} is the best ${t.label.toLowerCase()} pick right now${bestOpen ? `, and ${bestOpen.name} is the best open option` : ""}.` : "";
  const others = TASKS.filter((x) => x.slug !== t.slug);

  return (
    <div className="wrap">
      {!t.soon && w && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              { "@type": "Question", name: t.question, acceptedAnswer: { "@type": "Answer", text: `${answer} Based on ${t.sourceNote}` } },
              ...(bestOpen ? [{ "@type": "Question", name: `What is the best open model for ${t.label.toLowerCase()}?`, acceptedAnswer: { "@type": "Answer", text: `${bestOpen.name} by ${orgName(bestOpen.org)}.` } }] : []),
            ],
          }}
        />
      )}
      <div className="page-head">
        <div className="crumbs">
          <Link href="/best">Best for…</Link> / {t.label}
        </div>
        <div className="eyebrow" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Icon name={t.icon} /> {t.label}
        </div>
        <h1 className="h1" style={{ marginTop: 8 }}>{t.question}</h1>
        <p className="lede">{t.soon ? t.intro : answer}</p>
      </div>

      {t.soon ? (
        <div className="card" style={{ padding: 28, borderStyle: "dashed", maxWidth: 720 }}>
          <span className="soon">Coming soon</span>
          <h2 className="h2" style={{ marginTop: 12 }}>We&apos;re building our own speed tests</h2>
          <p className="sub" style={{ fontSize: 16 }}>
            We&apos;ll time how quickly each model starts replying and how fast it streams, every hour, from a fixed location. Until then we show no speed numbers, rather than borrow them from someone else.
          </p>
          <p className="sub" style={{ fontSize: 16 }}>
            Meanwhile, see the <Link className="link" href="/best/cheap">best cheap models</Link>, which are often the quick ones too.
          </p>
        </div>
      ) : (
        <>
          <div className="grid3">
            {[
              { k: "Winner", m: w },
              { k: "Best open", m: bestOpen },
              { k: t.slug === "cheap" ? "Runner-up" : "Best under $1", m: t.slug === "cheap" ? top[1]?.m : bestCheap },
            ].map(({ k, m }) => (
              <div key={k} className="card" style={{ padding: 18, display: "grid", gap: 8 }}>
                <div className="eyebrow">{k}</div>
                {m ? (
                  <>
                    <Link href={`/models/${m.slug}`} className="nm" style={{ fontSize: 18, fontWeight: 680 }}>
                      <Avatar org={m.org} size={28} />
                      <span className="n" title={m.name}>{m.base}</span>
                      <VariantChip v={m.variant} />
                      <OpenTag open={m.open} />
                    </Link>
                    <div style={{ color: "var(--muted)", fontSize: 14 }}>
                      {t.metric}: <b style={{ color: "var(--text)" }}>{disp(t.get(m)!)}</b>
                      {m.price ? ` · ${fmtPrice(m.price.blended_per_m)} blended per 1M tokens${m.price.blended_per_m === 0 ? " (listed at $0, not unknown)" : ""}` : " · No list price (not free)"}
                    </div>
                  </>
                ) : (
                  <span className="nodata">No data yet</span>
                )}
              </div>
            ))}
          </div>
          <section className="section">
            <h2 className="h2">Top 10 for {t.label.toLowerCase()}</h2>
            <p className="sub" style={{ marginBottom: 14 }}>
              {t.metric}
              {t.scale === "pct" ? ", 0 to 100 (percentile)" : ", a chess-style rating from blind human votes"}.
            </p>
            <div className="card lb">
              <BarRows items={top.map(({ m, v }) => ({ slug: m.slug, name: m.name, base: m.base, variant: m.variant, org: m.org, open: m.open, value: v, display: disp(v) }))} floor={floor} />
            </div>
            <p className="note">Based on {t.sourceNote} Bars start at {floor}. {r.length} models have data for this task.</p>
          </section>
        </>
      )}

      <section className="section">
        <h2 className="h2" style={{ marginBottom: 12 }}>Other tasks</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {others.map((o) => (
            <Link key={o.slug} href={`/best/${o.slug}`} className="pill">
              <Icon name={o.icon} width={16} height={16} /> {o.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
