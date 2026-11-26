import type { Metadata } from "next";
import Link from "next/link";
import { GapChart } from "@/components/ClientCharts";
import { JsonLd } from "@/components/JsonLd";
import { allModels, CHANGES, ensureData, textPublishDate } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { orgName } from "@/lib/orgs";
import { buildState, stateFaqs, toStateModel, type StateFact } from "@/lib/state";
import { og } from "@/lib/site";

export const metadata: Metadata = {
  title: "The state of AI",
  description: "Who leads, the open-weight gap, the cheapest model near the top, and what moved this month. Updated from the same snapshot as the ranking.",
  alternates: { canonical: "/state-of-ai" },
  openGraph: og("/state-of-ai"),
};

function Fact({ fact }: { fact: StateFact }) {
  return (
    <article className="card state-fact">
      <div className="glance-k">{fact.kicker}</div>
      <Link href={fact.href} className="state-title">{fact.title}</Link>
      <p className="state-src">{fact.source} · {fmtDate(fact.date)}</p>
    </article>
  );
}

export default async function Page() {
  await ensureData();
  const asOf = textPublishDate() || CHANGES.gap.at(-1)?.d || "";
  const report = buildState(allModels().map(toStateModel), CHANGES.gap, asOf, orgName);
  const labName = report.lab ? report.lab.title.replace(/^\d+ from /, "") : null;
  const faqs = stateFaqs(report, labName);
  return (
    <div className="wrap">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }}
      />
      <div className="page-head">
        <div className="eyebrow">The state of AI, updated daily</div>
        <h1 className="h1" style={{ marginTop: 8 }}>The state of AI</h1>
        <p className="lede">Every figure is computed from this snapshot. A missing series is left out. <Link href="/benchmarks">How to read a benchmark</Link></p>
      </div>

      <section className="section" style={{ marginTop: 8 }}>
        <h2 className="h2">Who is ahead</h2>
        <div className="state-grid">
          {report.overall ? <Fact fact={report.overall} /> : null}
          {report.jobs.map((job) => <Fact key={job.id} fact={job} />)}
        </div>
      </section>

      <section className="section" id="gap">
        <h2 className="h2">Open weights</h2>
        <div className="state-grid">
          {report.openModel ? <Fact fact={report.openModel} /> : null}
        </div>
        {report.gap ? (
          <div className="card" style={{ padding: 18, marginTop: 10 }}>
            <p className="sub" style={{ marginTop: 0 }}>Arena text vote scores. The gap is the leading closed model minus the leading open model, after each score is rounded.</p>
            <p className="state-title" style={{ margin: "4px 0" }}>{report.gap.now} pts <span style={{ color: "var(--muted)", fontWeight: 550, fontSize: 15 }}>was {report.gap.then} on {fmtDate(report.gap.thenDate)}</span></p>
            <GapChart points={report.gap.series} />
            <p className="state-src">Closed: <Link href="/compare">{report.gap.closedName}</Link> · Open: {report.gap.openName} · {report.gap.source} · {fmtDate(report.gap.date)}</p>
          </div>
        ) : null}
      </section>

      {report.nearTop ? (
        <section className="section">
          <h2 className="h2">Price near the top</h2>
          <div className="state-grid">
            <Fact fact={report.nearTop} />
          </div>
          <p className="note">Lowest OpenRouter list price among models within 5 SIscope points of the leader. There is no stored price history, so this is today&apos;s list, not a trend.</p>
        </section>
      ) : null}

      <section className="section">
        <h2 className="h2">This month</h2>
        <div className="state-grid">
          {report.releases.map((item) => <Fact key={item.id} fact={item} />)}
          {report.movers.map((item) => (
            <Fact key={item.id} fact={{ ...item, title: `${item.title} · ${item.direction === "up" ? "up" : "down"} ${item.places}` }} />
          ))}
          {report.lab ? <Fact fact={report.lab} /> : null}
        </div>
        {report.releases.length === 0 ? <p className="note">No scored model first shows up in the last 30 days of Arena history.</p> : null}
        <p className="note">A release is the first Arena history date for a model that has a SIscope score. A move is the change in Arena text place versus about 30 days earlier.</p>
      </section>

      <section className="section">
        <h2 className="h2">Questions</h2>
        <div className="card" style={{ padding: 18 }}>
          {faqs.map((f) => (
            <details key={f.q} className="state-faq">
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>
      <p className="note">Snapshot through {fmtDate(asOf)}. <Link href="/methodology">How the score is built</Link> · <Link href="/leaderboard">Full ranking</Link></p>
    </div>
  );
}
