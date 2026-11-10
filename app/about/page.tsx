import { og } from "@/lib/site";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description: "SIscope ranks AI models from public votes, written tests and list prices. No account and no paid placement.",
  alternates: { canonical: "/about" }, openGraph: og("/about"),
};

export default function Page() {
  return (
    <div className="wrap">
      <div className="page-head">
        <div className="eyebrow">About</div>
        <h1 className="h1" style={{ marginTop: 8 }}>An independent model ranking</h1>
        <p className="lede">SIscope shows which setting leads, on which job, and what the public list price is.</p>
      </div>
      <div className="prose">
        <h2>What you can do here</h2>
        <ul>
          <li><b>Start from a job.</b> Coding, writing, math, agents, open weights, or a price cap.</li>
          <li><b>Check the source.</b> Votes, written tests and list prices each link back. A missing result stays missing.</li>
          <li><b>See open weights beside closed models.</b> The gap is measured, not assumed.</li>
          <li><b>No account.</b> Nothing on the page is a paid placement.</li>
        </ul>
        <h2>Where the numbers come from</h2>
        <p>
          Arena (human votes, CC BY 4.0), Epoch AI (benchmark runs, CC BY 4.0), the OpenRouter models API (list prices) and the Exgentic Open Agent Leaderboard (CDLA-Permissive-2.0). Full details on the{" "}
          <Link href="/methodology">methodology page</Link>.
        </p>
        <h2>Download the snapshot</h2>
        <p>
          The current snapshot is JSON at <a href="/api/v0/models.json">/api/v0/models.json</a>. Credit SIscope and the original sources.
        </p>
        <h2>Not on the site yet</h2>
        <p>There is no speed or latency number until our own tests are running. We do not fill that gap from another site.</p>
      </div>
    </div>
  );
}
