import Link from "next/link";
import type { Enriched } from "@/lib/data";
import { orgName } from "@/lib/orgs";
import { Avatar, OpenTag, VariantChip } from "./Avatar";
import { MiniBars, Sparkline } from "./charts";
import { Icon, type IconName } from "./Icons";

export function PickCard({ icon, label, m, big, bigLabel, visual, visualNote, why, use }: { icon: IconName; label: string; m: Enriched; big: string; bigLabel: string; visual: React.ReactNode; visualNote?: string; why: React.ReactNode; use?: string }) {
  return (
    <Link href={`/models/${m.slug}`} className="card pick">
      <span className="cat">
        <Icon name={icon} /> {label}
      </span>
      <div style={{ minWidth: 0 }}>
        <div className="mname" title={m.name}>
          {m.base}
        </div>
        <div className="prov" style={{ marginTop: 4 }}>
          <Avatar org={m.org} size={20} />
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{orgName(m.org)}</span>
          <VariantChip v={m.variant} />
          <OpenTag open={m.open} />
        </div>
      </div>
      <div className="big">
        <b>{big}</b>
        <span>{bigLabel}</span>
      </div>
      <div>{visual}</div>
      {visualNote && <div className="tn">{visualNote}</div>}
      {use && (
        <div className="use">
          <b>Use this if</b> {use}
        </div>
      )}
      <div className="why">{why}</div>
    </Link>
  );
}

export function SoonPick({ icon, label, title, body }: { icon: IconName; label: string; title: string; body: string }) {
  return (
    <div className="card pick soon-card" aria-label={`${label}: coming soon`}>
      <span className="cat" style={{ color: "var(--soon)" }}>
        <Icon name={icon} /> {label}
      </span>
      <div className="mname" style={{ color: "var(--muted)" }}>
        {title}
      </div>
      <span className="soon" style={{ alignSelf: "flex-start" }}>
        Coming soon
      </span>
      <svg viewBox="0 0 200 36" width="100%" height="36" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={i * 42} y={24 - i * 5} width="30" height={12 + i * 5} rx="5" fill="none" stroke="var(--soon)" strokeOpacity=".45" strokeDasharray="4 3" />
        ))}
      </svg>
      <div className="why">{body}</div>
    </div>
  );
}

export { MiniBars, Sparkline };
