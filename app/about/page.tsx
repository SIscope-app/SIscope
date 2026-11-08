import { og } from "@/lib/site";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description: "SIscope is a free, independent tracker that shows which AI model is best for what, in plain words.",
  alternates: { canonical: "/about" }, openGraph: og("/about"),
};

export default function Page() {
  return (
    <div className="wrap">
      <div className="page-head">
        <div className="eyebrow">About</div>
        <h1 className="h1" style={{ marginTop: 8 }}>See which AI is best, at a glance</h1>
        <p className="lede">New AI models come out every week. SIscope tells you which ones are actually good, for what, and what they cost, without the jargon.</p>
      </div>
      <div className="prose">
        <h2>What makes it different</h2>
        <ul>
          <li><b>Pictures first.</b> Bars, charts and one clear pick per question, instead of giant tables.</li>
          <li><b>Honest numbers.</b> Every number comes from public human votes or independent test runs, and links back to its source. If we don&apos;t have it, we say so.</li>
          <li><b>Open and closed side by side.</b> See how far open-weight models are behind, or ahead.</li>
          <li><b>Free forever.</b> No sign-up and no paid placements.</li>
        </ul>
        <h2>Where the data comes from</h2>
        <p>
          Arena (human votes, CC BY 4.0), Epoch AI (benchmark runs, CC BY 4.0), the OpenRouter models API (list prices) and the Exgentic Open Agent Leaderboard (CDLA-Permissive-2.0). Full details on the{" "}
          <Link href="/methodology">methodology page</Link>.
        </p>
        <h2>Use the data</h2>
        <p>
          Everything is available as JSON at <a href="/api/v0/models.json">/api/v0/models.json</a>. Please credit SIscope and the original sources.
        </p>
        <h2>Status</h2>
        <p>This is an early preview (v0). Speed tests and more categories are on the way.</p>
      </div>
    </div>
  );
}
