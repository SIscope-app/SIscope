"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { QuickSearch } from "./Search";

const LINKS = [
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/compare", label: "Compare" },
  { href: "/best", label: "Best for…" },
  { href: "/tools/cost", label: "Cost" },
  { href: "/agents", label: "Agents" },
];
// The mobile menu also carries the reference pages.
const MORE = [
  { href: "/methodology", label: "How we score" },
  { href: "/about", label: "About" },
];

const TABS = [
  { href: "/", label: "Home", d: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { href: "/leaderboard", label: "Ranks", d: "M5 20V10M12 20V4M19 20v-7" },
  { href: "/best", label: "Best for", d: "M12 3l2.6 5.6L20 9.3l-4 4 1 5.7-5-2.8-5 2.8 1-5.7-4-4 5.4-.7z" },
  { href: "/compare", label: "Compare", d: "M8 4v16M16 4v16M4 8h8M12 16h8" },
  { href: "/tools/cost", label: "Cost", d: "M12 3v18M16 7.5c-.6-1.2-2-1.9-4-1.9-2.2 0-4 1-4 2.7s1.8 2.3 4 2.7 4 1 4 2.7-1.8 2.7-4 2.7c-2 0-3.4-.7-4-1.9" },
];

/** Thumb-reach tab bar, phones only (hidden above 900px in CSS). */
export function BottomNav() {
  const path = usePathname() ?? "/";
  return (
    <nav className="tabbar" aria-label="Quick">
      {TABS.map((t) => {
        const on = t.href === "/" ? path === "/" : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={t.d} />
            </svg>
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState<string | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(document.documentElement.dataset.theme ?? "dark");
  }, []);
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      className="iconbtn"
      aria-label={`Switch to ${next} theme`}
      onClick={() => {
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem("theme", next);
        } catch {}
        setTheme(next);
        window.dispatchEvent(new Event("themechange"));
      }}
    >
      {theme === "light" ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      )}
    </button>
  );
}

export function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [path]);
  return (
    <header className="site-header">
      <div className="wrap nav">
        <Link href="/" aria-label="SIscope home">
          <Logo />
        </Link>
        <nav className="nav-links" aria-label="Main">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={path?.startsWith(l.href) ? "page" : undefined}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div style={{ flex: 1 }} />
        <QuickSearch />
        <ThemeToggle />
        <button className="iconbtn mobile-menu" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>
      {open && (
        <nav className="wrap" aria-label="Mobile" style={{ paddingBottom: 14, display: "grid", gap: 4 }}>
          {[...LINKS, ...MORE].map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="card" style={{ padding: "12px 16px", fontWeight: 560, boxShadow: "none" }}>
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
