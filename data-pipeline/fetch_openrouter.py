"""Fetch list prices from OpenRouter's public models API (no scraping, API only).

Endpoint: https://openrouter.ai/api/v1/models  (no key needed)
We keep ONLY identity, context length and pricing fields. The response also
contains a `benchmarks` object that relays third-party indexes (including
Artificial Analysis); it is dropped here and never stored.
"""
from common import assert_no_blocked, now_iso, read_json_url, write_json

URL = "https://openrouter.ai/api/v1/models"
KEEP = ("id", "canonical_slug", "name", "created", "context_length", "hugging_face_id")


def main():
    fetched_at = now_iso()
    raw = read_json_url(URL, timeout=60)
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
        cache = p.get("input_cache_read")
        try:
            cache_n = float(cache) if cache not in (None, "") else 0.0
        except (TypeError, ValueError):
            cache_n = 0.0
        # Only a published cache-read price. Zero or absent is not a guess of "free cache".
        r["cache_read_per_m"] = round(cache_n * 1e6, 4) if cache_n > 0 else None
        arch = m.get("architecture") or {}
        r["modalities_in"] = arch.get("input_modalities")
        r["output_modalities"] = arch.get("output_modalities")
        top = m.get("top_provider") or {}
        cap = top.get("max_completion_tokens")
        r["max_output"] = int(cap) if isinstance(cap, int) or (isinstance(cap, float) and cap == int(cap)) else None
        params = m.get("supported_parameters")
        if isinstance(params, list):
            names = set(params)
            # Present in the list is a published capability. Absent from a published list is "not listed", not a guess.
            r["tools"] = "tools" in names
            r["structured"] = "structured_outputs" in names or "response_format" in names
            r["reasoning"] = "reasoning" in names or "include_reasoning" in names
        else:
            r["tools"] = r["structured"] = r["reasoning"] = None
        r.update(source="openrouter", license="OpenRouter API terms; cite source", fetched_at=fetched_at)
        rows.append(r)
    out = {"source": "openrouter", "fetched_at": fetched_at, "as_of": fetched_at, "models": rows}
    assert_no_blocked(out, "openrouter prices")
    print("openrouter priced models", len(rows))
    write_json("prices.json", out)


if __name__ == "__main__":
    main()
