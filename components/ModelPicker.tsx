"use client";
import { useId, useMemo, useRef, useState } from "react";
import type { Slim } from "@/lib/data";
import { orgName } from "@/lib/orgs";
import { Avatar } from "./Avatar";

/** Searchable model picker: type to filter by name or provider, Enter or click to pick. */
export function ModelPicker({ models, exclude = [], onPick, placeholder = "Add a model: type a name" }: { models: Slim[]; exclude?: string[]; onPick: (slug: string) => void; placeholder?: string }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const hits = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const words = ql.split(/\s+/).filter(Boolean);
    return models
      .filter((m) => !exclude.includes(m.slug))
      .filter((m) => {
        if (!words.length) return true;
        const hay = `${m.name} ${orgName(m.org)}`.toLowerCase();
        return words.every((w) => hay.includes(w));
      })
      .slice(0, 40);
  }, [models, exclude, q]);
  const pick = (slug: string) => {
    onPick(slug);
    setQ("");
    setOpen(false);
    setHi(0);
  };
  return (
    <div
      className="picker"
      ref={box}
      onBlur={(e) => {
        if (!box.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <input
        className="input"
        style={{ width: "100%" }}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-label="Search for a model to add"
        placeholder={placeholder}
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setHi(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setHi((h) => Math.min(h + 1, hits.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHi((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter" && open && hits[hi]) {
            e.preventDefault();
            pick(hits[hi].slug);
          } else if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && (
        <div className="picker-list" id={`${id}-list`} role="listbox" aria-label="Matching models">
          {hits.length === 0 && <div className="nodata" style={{ padding: 10 }}>No model matches &ldquo;{q}&rdquo;.</div>}
          {hits.map((m, i) => (
            <button key={m.slug} type="button" role="option" aria-selected={i === hi} className="picker-opt" onMouseEnter={() => setHi(i)} onClick={() => pick(m.slug)}>
              <Avatar org={m.org} size={20} />
              <span className="n">{m.name}</span>
              <span className="sc2">{m.si != null ? `SI ${m.si.toFixed(0)}` : "no score"}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
