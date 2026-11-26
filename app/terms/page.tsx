import type { Metadata } from "next";
import Link from "next/link";
import { og } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms",
  description: "How you may use SIscope. The numbers stay attributed to their sources.",
  alternates: { canonical: "/terms" },
  openGraph: og("/terms"),
};

export default function Page() {
  return (
    <div className="wrap">
      <div className="page-head">
        <div className="eyebrow">Terms</div>
        <h1 className="h1" style={{ marginTop: 8 }}>Terms</h1>
        <p className="lede">SIscope is a free, independent way to choose a model. It is not a model maker and not a broker.</p>
      </div>
      <section className="prose">
        <p>You may read the site and download the snapshot. Credit SIscope and the upstream sources named on each page and in the <Link href="/developers">API notes</Link>. A missing result is unmeasured. Do not republish it as a zero or as a score we did not compute.</p>
        <p>List prices are what OpenRouter published. They are not a quote, and a provider can charge something else. Scores are a summary of public votes and public tests. They are not a promise about a future answer.</p>
        <p>The site is provided as it is. We correct mistakes when we can. Contact <a href="mailto:team@siscope.app">team@siscope.app</a>.</p>
      </section>
    </div>
  );
}
