import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
      <div className="wrap page-head" style={{ minHeight: "50vh" }}>
      <div className="eyebrow">404</div>
      <h1 className="h1" style={{ marginTop: 8 }}>We couldn&apos;t find that page</h1>
      <p className="lede">
        Try the <Link className="link" href="/leaderboard">leaderboard</Link> or go <Link className="link" href="/">home</Link>.
      </p>
    </div>
  );
}
