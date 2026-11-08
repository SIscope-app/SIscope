"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

// [slug, name, provider, SIscope score or null, open 1/0], built by scripts/build-api.ts
type Entry = [string, string, string, number | null, 0 | 1];

let cache: Promise<Entry[]> | null = null;
function loadIndex() {
  if (!cache) cache = fetch("/search.json").then((r) => (r.ok ? r.json() : [])).catch(() => ((cache = null), []));
  return cache;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9.]+/g, " ").trim();

function find(idx: Entry[], q: string): Entry[] {
  const n = norm(q);
  if (!n) return idx.slice(0, 8);
  const toks = n.split(" ");
  const hits: { e: Entry; s: number }[] = [];
  for (const e of idx) {
    const name = norm(e[1]);
    const hay = `${name} ${norm(e[2])} ${e[0].replace(/-/g, " ")}`;
    if (!toks.every((t) => hay.includes(t))) continue;
    hits.push({ e, s: name.startsWith(n) ? 0 : name.includes(n) ? 1 : 2 });
  }
  // Stable sort keeps the index order (best SIscope score first) within each match tier.
  return hits.sort((a, b) => a.s - b.s).slice(0, 8).map((h) => h.e);
}

export function QuickSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState<Entry[] | null>(null);
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  const show = useCallback(() => {
    opener.current = document.activeElement as HTMLElement | null;
    setOpen(true);
    loadIndex().then(setIdx);
  }, []);
  const hide = useCallback(() => {
    setOpen(false);
    setQ("");
    setSel(0);
    opener.current?.focus?.();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (open) hide();
        else show();
      } else if (e.key === "/" && !typing && !open) {
        e.preventDefault();
        show();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, show, hide]);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  const results = idx ? find(idx, q) : [];
  const go = (e: Entry | undefined) => {
    if (!e) return;
    hide();
    router.push(`/models/${e[0]}`);
  };

  return (
    <>
      <button className="search-btn" onClick={show} onPointerEnter={() => loadIndex()} aria-label="Search models" aria-haspopup="dialog" aria-keyshortcuts="/ Control+K Meta+K">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
        <span className="search-lbl">Search models</span>
        <kbd className="search-kbd" aria-hidden="true">/</kbd>
      </button>
      {open && (
        <div className="qs-back" onMouseDown={(e) => e.target === e.currentTarget && hide()}>
          <div className="qs card" role="dialog" aria-modal="true" aria-label="Search models">
            <div className="qs-in">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-4-4" />
              </svg>
              <input
                ref={input}
                value={q}
                placeholder="Type a model or provider, e.g. Claude, Gemini, Qwen"
                aria-label="Model name"
                role="combobox"
                aria-expanded="true"
                aria-controls="qs-list"
                aria-activedescendant={results[sel] ? `qs-${sel}` : undefined}
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => {
                  setQ(e.target.value);
                  setSel(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSel((s) => Math.min(s + 1, results.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSel((s) => Math.max(s - 1, 0));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    go(results[sel]);
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    hide();
                  }
                }}
              />
              <button className="qs-esc" onClick={hide} aria-label="Close search">
                Esc
              </button>
            </div>
            <div id="qs-list" role="listbox" aria-label="Matching models" className="qs-list">
              {!idx ? (
                <div className="qs-empty">Loading…</div>
              ) : results.length === 0 ? (
                <div className="qs-empty">No model matches &ldquo;{q}&rdquo;.</div>
              ) : (
                results.map((e, i) => (
                  <div
                    key={e[0]}
                    id={`qs-${i}`}
                    role="option"
                    aria-selected={i === sel}
                    className="qs-opt"
                    onMouseEnter={() => setSel(i)}
                    onClick={() => go(e)}
                  >
                    <span className="n">{e[1]}</span>
                    {e[4] ? <span className="tag-open">OPEN</span> : null}
                    <span className="p">{e[2]}</span>
                    <span className="s">{e[3] != null ? e[3] : "–"}</span>
                  </div>
                ))
              )}
            </div>
            <div className="qs-foot">
              {q ? "↑ ↓ to move, Enter to open" : "Top models by SIscope score. Type to search all of them."}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
