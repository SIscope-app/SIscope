import Link from "next/link";
import { fmtDate } from "@/lib/format";
import { CATEGORIES, COVERAGE_GATE, SCORE_DATE, SCORE_VERSION } from "@/lib/score";

/** The same sentence next to a SIscope Score: what the number is, and which version produced it. */
export function ScoreNote({ coverage }: { coverage?: string }) {
  const weights = CATEGORIES.map((c) => `${c.short} ${c.weight}`).join(", ");
  return (
    <p className="score-note">
      The SIscope Score is a percentile-based composite, not a percentage. A missing result is not zero. Version {SCORE_VERSION} ({fmtDate(SCORE_DATE)}). Weights: {weights}. A listed score needs measured categories covering {Math.round(COVERAGE_GATE * 100)}% of that weight.
      {coverage ? ` ${coverage}` : ""} <Link href="/methodology">Method</Link>
    </p>
  );
}
