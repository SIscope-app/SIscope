"""Match an Arena model name to one OpenRouter listing.

A date in the Arena name must hit the listing id's MMDD suffix or that listing's
created date. An undated Arena name never takes a dated listing. Version numbers
such as 4.20 are not dates.
"""
from __future__ import annotations

import datetime as dt
import re

from common import base_key
from epoch_match import arena_dates


def _mmdd(token: str) -> str | None:
    if len(token) != 4 or not token.isdigit():
        return None
    month, day = int(token[:2]), int(token[2:])
    if 1 <= month <= 12 and 1 <= day <= 31:
        return token
    return None


def id_date(model_id: str) -> tuple[str, str | None]:
    """Return (id without a trailing -MMDD, that MMDD or None)."""
    tail = model_id.split("/")[-1]
    match = re.search(r"-(\d{4})$", tail)
    if not match or _mmdd(match.group(1)) is None:
        return tail, None
    return tail[: -(len(match.group(1)) + 1)], match.group(1)


def _created_dates(created) -> set[str]:
    if not created:
        return set()
    stamp = dt.datetime.fromtimestamp(int(created), dt.timezone.utc)
    ymd = stamp.strftime("%Y%m%d")
    return {ymd, ymd[4:]}


def _same_model(arena_name: str, row: dict) -> bool:
    want = base_key(arena_name)
    ident, _ = id_date(row.get("id") or "")
    keys = {base_key(row.get("name") or ""), base_key(ident), base_key(row.get("id") or "")}
    return want in keys and want != ""


def match_price(arena_name: str, rows: list[dict]) -> dict | None:
    """One listing, or None when nothing matches without guessing."""
    cands = [r for r in rows if _same_model(arena_name, r)]
    if not cands:
        return None
    dates = arena_dates(arena_name)
    if dates:
        by_id = [r for r in cands if (id_date(r.get("id") or "")[1] or "") in dates or any(
            len(d) == 8 and d[4:] == id_date(r.get("id") or "")[1] for d in dates if id_date(r.get("id") or "")[1]
        )]
        if len(by_id) == 1:
            return by_id[0]
        if len(by_id) > 1:
            return sorted(by_id, key=lambda r: len(r.get("id") or ""))[0]
        by_created = [r for r in cands if _created_dates(r.get("created")) & dates]
        undated = [r for r in by_created if id_date(r.get("id") or "")[1] is None]
        if len(undated) == 1:
            return undated[0]
        if len(by_created) == 1:
            return by_created[0]
        return None
    undated = [r for r in cands if id_date(r.get("id") or "")[1] is None]
    if len(undated) == 1:
        return undated[0]
    if len(undated) > 1:
        return sorted(undated, key=lambda r: len(r.get("id") or ""))[0]
    return None
