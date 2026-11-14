"""Strict matching of Epoch AI runs to Arena registry entries.

A run is attached to an Arena model only when the model AND its setting are clearly the same:
* same normalised base name;
* same reasoning effort (none/unspecified on both sides, or the same named level);
* same thinking budget when either side names one (e.g. "32K");
* no thinking/non-thinking ambiguity ("Thinking", "Non-Thinking", "Instant" variants need an
  explicit equivalent on the Epoch side, which Epoch does not publish, so they stay unmatched);
* dates, when both sides carry one, must agree; a dated Arena entry with an undated Epoch run is
  accepted only if no other Arena entry shares that base name (otherwise we can't tell which
  snapshot Epoch tested).
Everything else is left unmatched. There is no "nearest setting" fallback.
"""
from __future__ import annotations

import re

EFF = ["none", "minimal", "low", "medium", "high", "xhigh", "max"]


def arena_dates(name: str) -> set[str]:
    """Dates in an Arena name as MMDD strings plus full YYYYMMDD when present."""
    out = set()
    for y, mth, d in re.findall(r"(20\d{2})-?(\d{2})-?(\d{2})", name):
        out.add(f"{y}{mth}{d}")
    for g in re.findall(r"(?<![\d-])(\d{4})(?![\d-])", re.sub(r"(20\d{2})-?(\d{2})-?(\d{2})", "", name)):
        if 1 <= int(g[:2]) <= 12 and 1 <= int(g[2:]) <= 31:
            out.add(g)  # MMDD
    return out


def epoch_parts(version: str):
    """(name_without_suffix, suffix_lower_or_None, dates as YYYYMMDD set)."""
    v = version.split("/")[-1]
    suf = None
    if "_" in v:
        head, tail = v.rsplit("_", 1)
        if tail.lower() in EFF or re.fullmatch(r"\d+k", tail.lower()):
            v, suf = head, tail.lower()
    dates = {f"{y}{m}{d}" for y, m, d in re.findall(r"(20\d{2})-?(\d{2})-?(\d{2})", v)}
    return v, suf, dates


def dates_agree(a: set[str], e: set[str]) -> bool:
    if not a or not e:
        return True
    for x in a:
        for y in e:
            if x == y or (len(x) == 4 and y[4:] == x):
                return True
    return False


def arena_setting(variant: str | None):
    """(effort or None, budget like '32k' or None, thinking_flag) from an Arena variant string."""
    v = (variant or "").lower()
    eff = next((e for e in ["xhigh", "max", "high", "medium", "low", "minimal"] if re.search(rf"\b{e}\b", v)), None)
    bud = re.search(r"\b(\d+)k\b", v)
    think = None
    if re.search(r"non-?thinking|instant", v):
        think = "off"
    elif "thinking" in v:
        think = "on"
    return eff, (bud.group(1) + "k") if bud else None, think, "codex harness" in v


def pick_latest(runs: list[dict]) -> dict:
    """When Epoch published more than one run of the same version, keep the latest date.

    A later run replaces an earlier one. If the dates match, the higher score is kept.
    """
    return sorted(runs, key=lambda r: (r.get("run_date") or "", r.get("score") or 0))[-1]


def accept(arena_name: str, variant: str | None, version: str, dated_siblings: bool, has_plain_and_none: bool) -> tuple[bool, str]:
    """Return (ok, reason). `dated_siblings`: another Arena entry shares this base name."""
    eff, bud, think, harness = arena_setting(variant)
    _, suf, edates = epoch_parts(version)
    adates = arena_dates(arena_name)
    if not dates_agree(adates, edates):
        return False, "different snapshot date"
    if adates and not edates and dated_siblings:
        return False, "Arena entry is one dated snapshot; Epoch run is undated"
    if think is not None and not bud:
        return False, "thinking on/off not stated by Epoch"
    if bud or (suf and suf.endswith("k")):
        if bud and suf == bud:
            return True, "same thinking budget"
        return False, "different or missing thinking budget"
    if eff:
        return (suf == eff), ("same effort" if suf == eff else "different effort")
    # Arena gives no effort
    if suf is None:
        return True, "both default"
    if suf == "none":
        if harness:
            return False, "agent harness sets its own effort"
        if has_plain_and_none:
            return False, "Epoch has both default and no-reasoning runs"
        return True, "no-reasoning run for a no-effort entry"
    return False, "Epoch ran a named effort; Arena entry has none"
