import { orgColor, orgInitial, orgName } from "@/lib/orgs";

export function Avatar({ org, size = 24 }: { org: string; size?: number }) {
  return (
    <span
      className="av"
      style={{ background: orgColor(org), width: size, height: size, fontSize: Math.round(size * 0.5), borderRadius: Math.round(size * 0.3) }}
      title={orgName(org)}
      aria-hidden="true"
    >
      {orgInitial(org)}
    </span>
  );
}

export function OpenTag({ open, showClosed = false }: { open: boolean; showClosed?: boolean }) {
  if (open) return <span className="tag-open" title="Open weights: you can download and run it">OPEN</span>;
  return showClosed ? <span className="tag-closed" title="Closed: available through an API or app only">CLOSED</span> : null;
}

export function VariantChip({ v }: { v: string | null | undefined }) {
  if (!v) return null;
  return (
    <span className="chip vchip" title={`${v}: reasoning setting or version, as listed by the source`}>
      {v}
    </span>
  );
}
