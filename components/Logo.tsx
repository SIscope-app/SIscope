export function LogoMark({ size = 32 }: { size?: number }) {
  // A scope lens with three rising bars: "see the ranking at a glance".
  return (
    <span className="logo-mark" style={{ width: size, height: size }} aria-hidden="true">
      <svg width={size * 0.66} height={size * 0.66} viewBox="0 0 24 24" fill="none">
        <circle cx="10.5" cy="10.5" r="7.5" stroke="var(--accent)" strokeWidth="2.2" />
        <path d="M16.2 16.2L21 21" stroke="var(--accent)" strokeWidth="2.6" strokeLinecap="round" />
        <rect x="6.4" y="10.6" width="2.2" height="3.6" rx="1" fill="var(--c-open)" />
        <rect x="9.4" y="8.6" width="2.2" height="5.6" rx="1" fill="var(--accent)" />
        <rect x="12.4" y="6.4" width="2.2" height="7.8" rx="1" fill="var(--accent)" />
      </svg>
    </span>
  );
}

export function Logo() {
  return (
    <span className="logo">
      <LogoMark />
      <span>
        SIscope<span className="sr-only"> home</span>
      </span>
    </span>
  );
}
