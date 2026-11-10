import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  description: "That address is not a page on SIscope.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="wrap page-head" style={{ minHeight: "50vh" }}>
      <div className="eyebrow">404</div>
      <h1 className="h1" style={{ marginTop: 8 }}>That page is not here</h1>
      <p className="lede">The address may be mistyped, or the model may never have been in this snapshot.</p>
      <div className="decide-actions">
        <Link className="btn primary" href="/">Home</Link>
        <Link className="btn" href="/leaderboard">Full ranking</Link>
        <Link className="btn" href="/compare">Compare</Link>
        <Link className="btn" href="/best">Jobs</Link>
      </div>
    </div>
  );
}
