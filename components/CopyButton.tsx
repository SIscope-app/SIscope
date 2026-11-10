"use client";
import { useState } from "react";

export function CopyButton({ text, label, caption = "Copy" }: { text: string; label: string; caption?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn copy-btn"
      aria-label={`Copy ${label} address`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        setDone(true);
        setTimeout(() => setDone(false), 1600);
      }}
    >
      {done ? "Copied" : caption}
      <span className="sr-only" aria-live="polite">{done ? `${label} address copied` : ""}</span>
    </button>
  );
}
