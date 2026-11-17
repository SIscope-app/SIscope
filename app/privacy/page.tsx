import type { Metadata } from "next";
import { og } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What SIscope stores. No analytics account, and no tracking cookie.",
  alternates: { canonical: "/privacy" },
  openGraph: og("/privacy"),
};

export default function Page() {
  return (
    <div className="wrap">
      <div className="page-head">
        <div className="eyebrow">Privacy</div>
        <h1 className="h1" style={{ marginTop: 8 }}>Privacy</h1>
        <p className="lede">The site does not run an analytics product and does not set a tracking cookie.</p>
      </div>
      <section className="prose">
        <p>Pages are static. Choosing a theme writes <code>theme</code> to local storage in your browser so the next visit matches. That is not a cookie, and it never leaves the browser.</p>
        <p>The comparison address, the leaderboard filters, and the cost calculator keep your choices in the page URL. They are not sent to an account, because there is no account.</p>
        <p>The host may keep ordinary request logs, the way any web server does. SIscope does not add a third-party analytics script.</p>
        <p>Questions: <a href="mailto:team@siscope.app">team@siscope.app</a>.</p>
      </section>
    </div>
  );
}
