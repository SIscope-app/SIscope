import Link from "next/link";
import { Avatar, OpenTag, VariantChip } from "./Avatar";

export type RowItem = { slug: string; name: string; base: string; variant: string | null; org: string; open: boolean; value: number; display: string; extra?: React.ReactNode };

function Row({ slug, style, children }: { slug: string; style?: React.CSSProperties; children: React.ReactNode }) {
  return slug ? (
    <Link href={`/models/${slug}`} className="row" style={style}>
      {children}
    </Link>
  ) : (
    <div className="row" style={style}>
      {children}
    </div>
  );
}

export function BarRows({ items, floor = 0, ceil, startRank = 1, ranked = true }: { items: RowItem[]; floor?: number; ceil?: number; startRank?: number; ranked?: boolean }) {
  const hi = ceil ?? Math.max(...items.map((i) => i.value), floor + 1);
  return (
    <div>
      {items.map((it, i) => {
        const w = Math.max(2, Math.min(100, ((it.value - floor) / (hi - floor)) * 100));
        return (
          <Row key={it.slug || it.name + i} slug={it.slug} style={ranked ? undefined : { gridTemplateColumns: "minmax(0,1fr) 64px" }}>
            {ranked && <span className={`rk ${i + startRank === 1 ? "top" : ""}`}>{i + startRank}</span>}
            <span className="row-main">
              <span className="nm">
                <Avatar org={it.org} />
                <span className="n" title={it.name}>
                  {it.base}
                </span>
                <VariantChip v={it.variant} />
                <OpenTag open={it.open} />
                {it.extra}
              </span>
              <span className="barw" title={it.display}>
                <span className={`bar ${it.open ? "open" : ""}`} style={{ width: `${w.toFixed(1)}%` }} />
              </span>
            </span>
            <span className="sc">{it.display}</span>
          </Row>
        );
      })}
    </div>
  );
}

export function ModelLine({ m, size = 24 }: { m: { name: string; base: string; variant: string | null; org: string; open: boolean }; size?: number }) {
  return (
    <span className="nm">
      <Avatar org={m.org} size={size} />
      <span className="n" title={m.name}>
        {m.base}
      </span>
      <VariantChip v={m.variant} />
      <OpenTag open={m.open} />
    </span>
  );
}

export function SectionHead({ title, sub, more, id }: { title: string; sub?: React.ReactNode; more?: { href: string; label: string }; id?: string }) {
  return (
    <div className="sh">
      <div>
        <h2 className="h2" id={id}>
          {title}
        </h2>
        {sub && <p className="sub">{sub}</p>}
      </div>
      {more && (
        <Link className="more" href={more.href}>
          {more.label} →
        </Link>
      )}
    </div>
  );
}
