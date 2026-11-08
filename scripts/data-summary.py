#!/usr/bin/env python3
"""Compare data/models.json with the last committed copy and print a short refresh summary."""
import json, subprocess, sys
from pathlib import Path

site = Path(__file__).resolve().parent.parent
new = json.loads((site / "data/models.json").read_text())
try:
    old = json.loads(subprocess.run(["git", "show", "HEAD:data/models.json"], cwd=site, capture_output=True, check=True, text=True).stdout)
except Exception:
    old = {"models": [], "built_at": "none"}
srcs = json.loads((site / "data/sources.json").read_text())

om = {m["slug"]: m for m in old["models"]}
nm = {m["slug"]: m for m in new["models"]}
added = sorted(set(nm) - set(om))
removed = sorted(set(om) - set(nm))
price_moves = []
for s in set(nm) & set(om):
    a, b = (om[s].get("price") or {}).get("blended_per_m"), (nm[s].get("price") or {}).get("blended_per_m")
    if a and b and abs(b - a) / a >= 0.05:
        price_moves.append((nm[s]["name"], a, b))
top = lambda d: min((m for m in d["models"] if m.get("arena", {}).get("text")), key=lambda m: m["arena"]["text"]["rank"], default=None)
t_old, t_new = top(old), top(new)

pub = json.loads((site / "data/publish.json").read_text())
print(f"Last successful update (changes only after a checked deploy): {pub.get('last_success_at')}")
print(f"Dataset built at: {old.get('built_at')} -> {new.get('built_at')}")
print(f"Models: {len(om)} -> {len(nm)} (+{len(added)} / -{len(removed)})")
if added: print("  Added:", ", ".join(nm[s]["name"] for s in added[:15]) + (" ..." if len(added) > 15 else ""))
if removed: print("  Removed:", ", ".join(om[s]["name"] for s in removed[:15]) + (" ..." if len(removed) > 15 else ""))
print(f"Text arena #1: {t_old['name'] if t_old else '-'} -> {t_new['name'] if t_new else '-'}")
print(f"Price changes of 5% or more: {len(price_moves)}")
for n, a, b in sorted(price_moves, key=lambda x: -abs(x[2] - x[1]) / x[1])[:10]:
    print(f"  {n}: ${a:.2f} -> ${b:.2f} per 1M")
print("Sources:")
for s in srcs["sources"]:
    print(f"  {s['name']}: data as of {s['as_of']}, fetched {s['fetched_at']}")
sys.exit(0)
