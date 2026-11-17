import type { Metadata } from "next";
import Link from "next/link";
import { SOURCES, ensureData } from "@/lib/data";
import { og } from "@/lib/site";

export const metadata: Metadata = {
  title: "API",
  description: "The static JSON snapshot, how to fetch it, the upstream licences, and how to cache it.",
  alternates: { canonical: "/developers" },
  openGraph: og("/developers"),
};

export default async function Page() {
  await ensureData();
  return (
    <div className="wrap">
      <div className="page-head">
        <div className="eyebrow">Developers</div>
        <h1 className="h1" style={{ marginTop: 8 }}>Snapshot API</h1>
        <p className="lede">Static JSON. No key. The files update when the site does.</p>
      </div>
      <section className="prose">
        <h2>Endpoints</h2>
        <p>
          <a href="/api/v0/models.json">/api/v0/models.json</a> is every tracked model: score, coverage, Arena blocks, Epoch runs, and the OpenRouter list price. A missing number is null.
        </p>
        <pre className="card" style={{ padding: 16, overflow: "auto" }}>{`curl -s https://siscope.app/api/v0/models.json | head -c 400`}</pre>
        <p>
          <a href="/search.json">/search.json</a> is a short index for the site search: slug, name, provider, score, and whether the weights are open.
        </p>
        <pre className="card" style={{ padding: 16, overflow: "auto" }}>{`curl -s https://siscope.app/search.json | head -c 200`}</pre>
        <p>
          <a href="/feed.xml">/feed.xml</a> is the Atom feed of recent changes.
        </p>
        <pre className="card" style={{ padding: 16, overflow: "auto" }}>{`curl -s https://siscope.app/feed.xml`}</pre>
        <h2>Licence</h2>
        <p>
          Credit SIscope and the upstream sources. Arena and Epoch AI data in the snapshot are CC BY 4.0. Keep their attributions. OpenRouter prices are cited under the OpenRouter API terms. The Open Agent Leaderboard file is CDLA-Permissive-2.0.
        </p>
        <ul>
          {SOURCES.sources.map((s) => (
            <li key={s.id}>
              <a href={s.home} rel="noopener">{s.name}</a>
              {s.license_url ? <> · <a href={s.license_url} rel="noopener license">{s.license}</a></> : <> · {s.license}</>}
              . {s.attribution}
            </li>
          ))}
        </ul>
        <h2>Fair use and caching</h2>
        <p>
          Fetch the snapshot at most a few times a day. Cache it for at least an hour. Do not poll it in a loop, and do not present the numbers as your own measurement. A null is unmeasured. Do not turn it into a zero. The method is on the <Link href="/methodology">methodology page</Link>.
        </p>
      </section>
    </div>
  );
}
