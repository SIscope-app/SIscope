import type { SVGProps } from "react";

const P = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export type IconName = "star" | "code" | "open" | "value" | "fast" | "math" | "pen" | "eye" | "agent" | "list" | "chat" | "brain" | "search" | "arrow" | "info" | "sliders" | "compare" | "spark";

const PATHS: Record<IconName, React.ReactNode> = {
  star: <path d="M12 3l2.6 5.6L20 9.3l-4 4 1 5.7-5-2.8-5 2.8 1-5.7-4-4 5.4-.7z" />,
  code: <path d="M8 7l-5 5 5 5M16 7l5 5-5 5" />,
  open: <path d="M12 3v12M7 10l5 5 5-5M4 20h16" />,
  value: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .8-3 2s1.3 1.7 3 2 3 .8 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6v2M12 16v2" />
    </>
  ),
  fast: <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
  math: <path d="M5 7h14M5 17h14M12 3v8M9 14l6 6M15 14l-6 6" />,
  pen: <path d="M4 20l4-1 11-11-3-3L5 16z" />,
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  agent: (
    <>
      <rect x="4" y="7" width="16" height="12" rx="3" />
      <path d="M12 3v4M9 12h.01M15 12h.01M9 16h6" />
    </>
  ),
  list: <path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" />,
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  brain: <path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 0V7a3 3 0 0 0-3-3zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 0" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </>
  ),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  sliders: <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4" />,
  compare: <path d="M8 3v18M16 3v18M3 8h5M16 16h5M3 16h5M16 8h5" />,
  spark: <path d="M3 17l5-5 4 4 8-9M15 7h5v5" />,
};

export function Icon({ name, ...p }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true" {...P} {...p}>
      {PATHS[name]}
    </svg>
  );
}
