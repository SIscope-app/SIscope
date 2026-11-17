/** Write /feed.xml at build time so the worker does not run a feed route. */
import { mkdirSync, writeFileSync } from "node:fs";
import { CHANGES } from "../lib/data";
import { fmtDate } from "../lib/format";
import { changeRangeLabel, materialChanges, priceChangeCopy } from "../lib/home-layout";
import { SITE } from "../lib/site";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const items = materialChanges(CHANGES.changes, CHANGES.gap);
const updated = CHANGES.week_to || items.at(-1)?.date || "";
const body = items
  .map((c) => {
    const price = c.kind === "price_new" || c.kind === "price_cut" ? priceChangeCopy(c.sub) : null;
    const title = price ? `${c.model ?? c.text}: ${price.headline}` : c.text;
    const summary = price ? `${price.detail}. ${fmtDate(c.date)}` : `${c.sub} ${fmtDate(c.date)}`;
    const href = c.slug ? `${SITE.url}/models/${c.slug}` : `${SITE.url}/changes`;
    return `<entry>
      <title>${esc(title)}</title>
      <link href="${esc(href)}"/>
      <id>${esc(href)}#${esc(c.date)}-${esc(c.kind)}</id>
      <updated>${esc(c.date)}T12:00:00Z</updated>
      <summary>${esc(summary)}</summary>
    </entry>`;
  })
  .join("\n");
const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>SIscope changes</title>
  <subtitle>${esc(changeRangeLabel(items, (d) => fmtDate(d)))}</subtitle>
  <link href="${SITE.url}/feed.xml" rel="self"/>
  <link href="${SITE.url}/changes"/>
  <id>${SITE.url}/feed.xml</id>
  <updated>${esc(updated)}T12:00:00Z</updated>
  ${body}
</feed>
`;
mkdirSync("public", { recursive: true });
writeFileSync("public/feed.xml", xml);
console.log(`wrote public/feed.xml (${items.length} entries)`);
