import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { ensureData, modelBySlug, siRanked } from "@/lib/data";
import { fmtPrice } from "@/lib/format";
import { matchupByKey, popularMatchups } from "@/lib/matchups";
import { compareSummary } from "@/lib/present";
import { SITE, og } from "@/lib/site";

export function generateStaticParams() {
  return popularMatchups(siRanked()).map((p) => ({ pair: p.key }));
}

export async function generateMetadata({ params }: { params: Promise<{ pair: string }> }): Promise<Metadata> {
  await ensureData();
  const { pair } = await params;
  const hit = matchupByKey(siRanked(), pair);
  if (!hit) return { title: "Comparison not found", robots: { index: false, follow: true } };
  const a = modelBySlug(hit.left)!;
  const b = modelBySlug(hit.right)!;
  const score = (m: NonNullable<typeof a>) => (m.si == null ? "no SIscope score" : `score ${m.si.toFixed(0)}`);
  return {
    title: `${a.name} vs ${b.name}`,
    description: `${a.name} (${score(a)}) against ${b.name} (${score(b)}). Unmeasured results are shown as unmeasured, never as zero.`,
    alternates: { canonical: `/compare/${hit.key}` },
    openGraph: og(`/compare/${hit.key}`),
  };
}

export default async function Page({ params }: { params: Promise<{ pair: string }> }) {
  await ensureData();
  const { pair } = await params;
  const hit = matchupByKey(siRanked(), pair);
  if (!hit) notFound();
  const a = modelBySlug(hit.left);
  const b = modelBySlug(hit.right);
  if (!a || !b) notFound();
  const { summary } = compareSummary([
    { slug: a.slug, name: a.name, si: a.si, cats: a.cats, price: a.price?.blended_per_m ?? null },
    { slug: b.slug, name: b.name, si: b.si, cats: b.cats, price: b.price?.blended_per_m ?? null },
  ]);
  const url = `${SITE.url}/compare/${hit.key}`;
  const card = (m: typeof a) => (
    <article className="card" style={{ padding: 18 }}>
      <Link href={`/models/${m.slug}`} className="decide-name">{m.name}</Link>
      <p className="sub">{m.si == null ? "No SIscope score yet." : `SIscope score ${m.si.toFixed(0)}.`} {m.price ? `${fmtPrice(m.price.blended_per_m)} per 1M.` : "No list price."}</p>
    </article>
  );
  return (
    <div className="wrap">
      <div className="page-head">
        <div className="crumbs"><Link href="/compare">Compare</Link> / {a.base} vs {b.base}</div>
        <h1 className="h1" style={{ marginTop: 8 }}>{a.name} vs {b.name}</h1>
        <p className="lede">{summary}</p>
      </div>
      <div className="grid2">
        {card(a)}
        {card(b)}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
        <Link className="btn primary" href={`/compare?m=${a.slug},${b.slug}`}>Open in the comparison tool</Link>
        <CopyButton text={url} label="comparison" caption="Copy link" />
      </div>
    </div>
  );
}
