import { PUBLISH, SOURCES } from "@/lib/data";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { sourceShortLabel } from "@/lib/freshness";

/** Near the top of every page. The success time is not a source dataset's as-of date. */
export function Freshness() {
  return (
    <section className="freshness" aria-label="Data freshness">
      <div className="wrap freshness-inner">
        <p className="freshness-row">
          <strong>Last successful update</strong>
          <time className="tnum" dateTime={PUBLISH.last_success_at}>
            {fmtDateTime(PUBLISH.last_success_at)}
          </time>
        </p>
        <p className="fresh-note">This time stays put unless that refresh is deployed and the public pages check out. Source dates can be older.</p>
        <ul className="fresh-sources">
          {SOURCES.sources.map((s) => (
            <li key={s.id}>
              <a href={s.home} rel="noopener">
                {sourceShortLabel(s.id, s.name)}
              </a>{" "}
              as of <time dateTime={s.as_of}>{fmtDate(s.as_of)}</time>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
