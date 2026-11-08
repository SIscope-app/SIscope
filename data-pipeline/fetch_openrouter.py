"""Fetch list prices from OpenRouter's public models API (no scraping, API only).

Endpoint: https://openrouter.ai/api/v1/models  (no key needed)
We keep ONLY identity, context length and pricing fields. The response also
contains a `benchmarks` object that relays third-party indexes (including
Artificial Analysis); it is dropped here and never stored.
"""
import json
import urllib.request

from common import UA, assert_no_blocked, now_iso, write_json

URL = "https://openrouter.ai/api/v1/models"
KEEP = ("id", "canonical_slug", "name", "created", "context_length", "hugging_face_id")


def main():
    fetched_at = now_iso()
    raw = json.load(urllib.request.urlopen(urllib.request.Request(URL, headers={"User-Agent": UA}), timeout=60))
    rows = []
    for m in raw["data"]:
        mid = m["id"]
        if mid.endswith((":free", ":batch", ":extended", ":thinking", ":beta")) or mid.startswith("~"):
            continue
        p = m.get("pricing") or {}
        try:
            inp, outp = float(p.get("prompt", "nan")), float(p.get("completion", "nan"))
        except ValueError:
            continue
        if not (inp > 0 or outp > 0):
            continue  # free/stealth/router entries carry no list price
        r = {k: m.get(k) for k in KEEP}
        r["input_per_m"] = round(inp * 1e6, 4)
        r["output_per_m"] = round(outp * 1e6, 4)
        r["modalities_in"] = (m.get("architecture") or {}).get("input_modalities")
        r.update(source="openrouter", license="OpenRouter API terms; cite source", fetched_at=fetched_at)
        rows.append(r)
    out = {"source": "openrouter", "fetched_at": fetched_at, "as_of": fetched_at, "models": rows}
    assert_no_blocked(out, "openrouter prices")
    print("openrouter priced models", len(rows))
    write_json("prices.json", out)


if __name__ == "__main__":
    main()
