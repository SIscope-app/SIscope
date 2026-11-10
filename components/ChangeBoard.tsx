"use client";
import { useState } from "react";

/** Default grid hides a trailing partial row in CSS. Opening it shows every card in one column. */
export function ChangeBoard({ children }: { children: React.ReactNode }) {
  const [all, setAll] = useState(false);
  return (
    <>
      <div className={`chg-grid${all ? " chg-all" : ""}`}>{children}</div>
      <p className="chg-more-row">
        <button type="button" className="btn chg-more" aria-expanded={all} onClick={() => setAll((v) => !v)}>
          {all ? "Show fewer" : "See all changes"}
        </button>
      </p>
    </>
  );
}
