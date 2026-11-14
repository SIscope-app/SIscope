"""Merge fetched sources into the site's canonical data files.

Inputs (written by fetch_*.py): data/arena.json, data/epoch.json, data/prices.json, data/agents_exgentic.json
Outputs: data/models.json, data/changes.json, data/sources.json, data/meta.json

Matching is deterministic and conservative:
* Arena names are the registry (one entry per Arena model + reasoning setting).
* Epoch rows match on the normalised base name; the same reasoning setting is
  preferred, otherwise the nearest setting is used and flagged `approx`.
* OpenRouter list prices match on the normalised base name and apply to all
  reasoning settings of that model.
"""
import collections
import datetime as dt
import re

from epoch_match import accept, arena_dates, dates_agree, pick_latest
from common import EFFORTS, assert_no_blocked, base_key, effort_of, now_iso, read_json, slugify, split_name, write_json

LADDER = ["none", "minimal", "low", "medium", "high", "xhigh", "max"]
TEXT_CATS = ["coding", "math", "creative_writing", "instruction_following", "hard_prompts", "multi_turn", "longer_query", "non_english"]


def ladder_pos(e):
    if e is None or e == "none":
        return 0
    if re.match(r"^\d+k$", e):
        return LADDER.index("high")
    return LADDER.index(e) if e in LADDER else 3


def epoch_key(v):
    parts = v.rsplit("_", 1)
    eff = None
    if len(parts) == 2 and (parts[1].lower() in EFFORTS or re.match(r"^\d+k$", parts[1].lower())):
        v, eff = parts[0], parts[1].lower()
    return base_key(v), eff


def pct_map(rows, key):
    """Percentile (0-100): share of other models on the same board with a lower score."""
    vals = [r[key] for r in rows if r.get(key) is not None]
    n = len(vals)
    out = {}
    for r in rows:
        v = r.get(key)
        if v is None or n < 2:
            continue
        below = sum(1 for x in vals if x < v)
        out[r["name"]] = round(100 * below / (n - 1), 1)
    return out


# Arena licence labels that are wrong for open-weights purposes (weights were never published).
NOT_OPEN = {"Qwen-Max (0919)"}  # API-only; Arena labels it with the "Qwen" licence


def is_open(lic, name=""):
    """Open weights = the licence lets you download the weights. Unknown or placeholder licences count as closed."""
    if name in NOT_OPEN:
        return False
    return bool(lic) and lic.strip().lower() not in ("proprietary", "", "-", "unknown", "n/a")


def main():
    arena = read_json("arena.json")
    epoch = read_json("epoch.json")
    prices = read_json("prices.json")
    exg = read_json("agents_exgentic.json")
    built_at = now_iso()
    A = arena["boards"]
    arena_src = {"source": "arena", "license": arena["license"], "fetched_at": arena["fetched_at"]}
    epoch_src = {"source": "epoch", "license": "CC-BY-4.0", "fetched_at": epoch["fetched_at"]}
    or_src = {"source": "openrouter", "license": "OpenRouter API terms; cite source", "fetched_at": prices["fetched_at"]}

    # registry
    reg = collections.OrderedDict()
    for board, cat in [("text", "overall"), ("webdev", "overall"), ("vision", "overall"), ("agent", "overall")]:
        for r in A[board][cat]["rows"]:
            if r["name"] not in reg:
                base, variant = split_name(r["name"])
                reg[r["name"]] = {"name": r["name"], "base": base, "variant": variant, "org": r["org"] or "other",
                                  "model_license": r["model_license"], "open": is_open(r["model_license"], r["name"])}
    # slugs
    used = set()
    for m in reg.values():
        s = slugify(m["name"]) or "model"
        i = 2
        while s in used:
            s = f"{slugify(m['name'])}-{i}"; i += 1
        used.add(s); m["slug"] = s

    # arena blocks + percentiles
    def board_rows(board, cat="overall"):
        return {r["name"]: r for r in A[board][cat]["rows"]}

    pcts = {}
    pcts["text"] = pct_map(A["text"]["overall"]["rows"], "rating")
    pcts["webdev"] = pct_map(A["webdev"]["overall"]["rows"], "rating")
    pcts["vision"] = pct_map(A["vision"]["overall"]["rows"], "rating")
    pcts["agent"] = pct_map(A["agent"]["overall"]["rows"], "score")
    for c in TEXT_CATS:
        pcts["text_" + c] = pct_map(A["text"][c]["rows"], "rating")
    rows = {b: board_rows(b) for b in ["text", "webdev", "vision", "agent"]}
    catrows = {c: board_rows("text", c) for c in TEXT_CATS}

    # epoch index
    E = collections.defaultdict(lambda: collections.defaultdict(list))
    for r in epoch["results"]:
        k, eff = epoch_key(r["model_version"])
        E[k][r["benchmark"]].append((eff, r))

    # price index (prefer shortest id per key, i.e. the main endpoint, not a dated snapshot)
    P = {}
    for r in sorted(prices["models"], key=lambda x: len(x["id"])):
        P.setdefault(base_key(r["name"]), r)

    hist_text = arena["history"]["text"]["series"]
    hist_web = arena["history"]["webdev"]["series"]
    models = []
    stats = collections.Counter()
    rejected = []
    siblings = collections.Counter(base_key(mm["base"]) for mm in reg.values())
    _sd = collections.defaultdict(set)
    for mm in reg.values():
        _sd[base_key(mm["base"])].add(frozenset(arena_dates(mm["name"])))
    snap_dates = {kk: len(v) for kk, v in _sd.items()}
    price_rejected = []
    for name, m in reg.items():
        arena_block = {}
        for b in ["text", "webdev", "vision", "agent"]:
            r = rows[b].get(name)
            if r:
                blk = {k: v for k, v in r.items() if k not in ("name", "org", "model_license")}
                blk["pct"] = pcts[b].get(name)
                blk["board_size"] = len(A[b]["overall"]["rows"])
                arena_block[b] = {**blk, **arena_src}
        cats = {}
        for c in TEXT_CATS:
            r = catrows[c].get(name)
            if r:
                cats[c] = {"rating": r["rating"], "rank": r["rank"], "pct": pcts["text_" + c].get(name), "board_size": len(A["text"][c]["rows"])}
        if cats:
            arena_block["text_categories"] = {"cats": cats, **arena_src}
        # epoch (strict: see epoch_match.py; no nearest-setting fallback)
        k = base_key(m["base"])
        ep = []
        for bench, cands in E.get(k, {}).items():
            versions = {c[1]["model_version"] for c in cands}
            plain_and_none = any(epoch_key(v)[1] is None for v in versions) and any(epoch_key(v)[1] == "none" for v in versions)
            ok = []
            for c in cands:
                good, why = accept(m["name"], m["variant"], c[1]["model_version"], siblings[k] > 1, plain_and_none)
                (ok if good else rejected).append((c, why) if good else {"model": m["name"], "benchmark": bench, "epoch_version": c[1]["model_version"], "reason": why})
            if not ok:
                continue
            pick = pick_latest([c[1] for c, _why in ok])
            ep.append({"benchmark": bench, "score": pick["score"], "stderr": pick["stderr"], "tested_as": pick["model_version"],
                       "approx": False, "run_date": pick["run_date"], "log_url": pick["log_url"], **epoch_src})
            stats["epoch_matched"] += 1
        # price
        pr = P.get(k)
        price = None
        if pr:
            # snapshot check: a price only attaches to the same dated snapshot. A dated Arena entry may use the
            # undated (current) endpoint only when Arena lists a single snapshot of this model.
            od = arena_dates(pr["id"].split("/")[-1].replace("-", " ")) | arena_dates(pr["name"])
            ad = arena_dates(m["name"])
            why = None
            if od and ad and not dates_agree(ad, od):
                why = "different snapshot date"
            elif od and not ad:
                why = "price is for a dated snapshot; Arena entry is undated"
            elif ad and not od and snap_dates[k] > 1:
                why = "Arena lists several snapshots; price endpoint is undated"
            if why:
                price_rejected.append({"model": m["name"], "openrouter_id": pr["id"], "reason": why})
                pr = None
        if pr:
            blended = round((3 * pr["input_per_m"] + pr["output_per_m"]) / 4, 4)
            price = {"openrouter_id": pr["id"], "input_per_m": pr["input_per_m"], "output_per_m": pr["output_per_m"],
                     "cache_read_per_m": pr.get("cache_read_per_m"),
                     "blended_per_m": blended, "context_length": pr["context_length"], "modalities_in": pr["modalities_in"],
                     "as_of": prices["as_of"], **or_src}
            stats["priced"] += 1
        hist = {}
        if name in hist_text:
            hist["text"] = hist_text[name]
        if name in hist_web:
            hist["webdev"] = hist_web[name]
        models.append({**m, "arena": arena_block, "epoch": ep, "price": price, "history": hist})

    # epoch benchmark percentiles among matched registry models (per benchmark)
    for bench in epoch["benchmarks"]:
        vals = [(mm["name"], e["score"]) for mm in models for e in mm["epoch"] if e["benchmark"] == bench]
        allscores = [r["score"] for r in epoch["results"] if r["benchmark"] == bench]
        n = len(allscores)
        for mm in models:
            for e in mm["epoch"]:
                if e["benchmark"] == bench:
                    e["pct"] = round(100 * sum(1 for x in allscores if x < e["score"]) / max(n - 1, 1), 1)
                    e["tested_models"] = n

    # value percentile (score per dollar) is computed client-side from price + text rating
    assert_no_blocked(models, "models")
    write_json("models.json", {"built_at": built_at, "count": len(models), "models": models,
                               "epoch_benchmarks": epoch["benchmarks"]})
    print(dict(stats), "models", len(models))
    # audit trail of Epoch runs we refused to attach (unique model/version pairs)
    seen = {}
    for r in rejected:
        seen.setdefault((r["model"], r["epoch_version"]), r)
    write_json("price_rejected.json", {"built_at": built_at, "count": len(price_rejected), "rows": price_rejected})
    write_json("epoch_rejected.json", {"built_at": built_at, "count": len(seen), "rows": sorted(seen.values(), key=lambda r: (r["model"], r["epoch_version"]))})

    # ---- changes feed (real, from Arena history + OpenRouter created dates)
    th = arena["history"]["text"]
    dates = th["dates"]
    d1, d0 = dates[-1], dates[-2]
    cur = {n: s for n, s in th["series"].items() if s and s[-1][0] == d1}
    prev = {n: [x for x in s if x[0] == d0] for n, s in th["series"].items()}
    prev = {n: v[0] for n, v in prev.items() if v}
    changes = []
    top_now = min(cur.items(), key=lambda kv: kv[1][-1][2])[0]
    top_prev = min(prev.items(), key=lambda kv: kv[1][2])[0] if prev else None
    if top_now != top_prev:
        changes.append({"kind": "new_leader", "board": "text", "model": top_now, "text": f"{split_name(top_now)[0]} takes #1", "sub": f"New #1 in the text arena, ahead of {split_name(top_prev)[0] if top_prev else '—'}", "date": d1})
    else:
        weeks = sum(1 for d in dates if min(((n, [x for x in s if x[0] == d]) for n, s in th['series'].items() if any(x[0] == d for x in s)), key=lambda kv: kv[1][0][2])[0] == top_now)
        changes.append({"kind": "holds_leader", "board": "text", "model": top_now, "text": f"{split_name(top_now)[0]} holds #1", "sub": f"Text arena · #1 in {weeks} of the last {len(dates)} updates", "date": d1})
    new = sorted([n for n in cur if n not in prev], key=lambda n: cur[n][-1][2])
    for n in [n for n in new if n != top_now][:4]:
        changes.append({"kind": "new_entry", "board": "text", "model": n, "text": f"{split_name(n)[0]} debuts at #{cur[n][-1][2]}", "sub": "New on the text arena", "date": d1})
    moves = []
    for n, s in cur.items():
        if n in prev and s[-1][2] <= 40:
            moves.append((prev[n][2] - s[-1][2], n))
    moves.sort()
    for delta, n in moves[::-1][:2]:
        if delta > 0:
            changes.append({"kind": "up", "board": "text", "model": n, "text": f"{split_name(n)[0]} climbs {delta} place{'s' if delta > 1 else ''}", "sub": f"Now #{cur[n][-1][2]} in text arena", "date": d1})
    for delta, n in moves[:1]:
        if delta < 0:
            changes.append({"kind": "down", "board": "text", "model": n, "text": f"{split_name(n)[0]} slips {-delta} place{'s' if delta < -1 else ''}", "sub": f"Now #{cur[n][-1][2]} in text arena", "date": d1})
    gap = th["gap"]
    g1, g0 = gap[-1], gap[-2]
    if g1["closed"] and g1["open"]:
        changes.append({"kind": "gap", "board": "text", "text": f"Open models {round(g1['closed'] - g1['open'])} points behind", "sub": f"Gap between best closed and best open was {round(g0['closed'] - g0['open'])} at the previous update", "date": d1})
    wh = arena["history"]["webdev"]
    wd = wh["dates"]
    wcur = {n: s for n, s in wh["series"].items() if s and s[-1][0] == wd[-1]}
    wprev = {n for n, s in wh["series"].items() if any(x[0] == wd[-2] for x in s)}
    for n in sorted([n for n in wcur if n not in wprev], key=lambda n: wcur[n][-1][2])[:2]:
        changes.append({"kind": "new_entry", "board": "webdev", "model": n, "text": f"{split_name(n)[0]} joins the coding board at #{wcur[n][-1][2]}", "sub": "WebDev arena (building web apps)", "date": wd[-1]})
    # new priced models on OpenRouter in the last 14 days that are also on an Arena board
    cutoff = dt.datetime.now(dt.timezone.utc).timestamp() - 14 * 86400
    by_key = {base_key(m["base"]): m for m in reg.values()}
    for r in sorted(prices["models"], key=lambda r: -(r["created"] or 0)):
        if (r["created"] or 0) < cutoff:
            break
        mm = by_key.get(base_key(r["name"]))
        if mm:
            changes.append({"kind": "price_new", "board": "price", "model": mm["name"], "text": f"{mm['base']} gets a public price", "sub": f"${r['input_per_m']:g} in, ${r['output_per_m']:g} out per 1M tokens on OpenRouter",
                            "date": dt.datetime.fromtimestamp(r["created"], dt.timezone.utc).date().isoformat()})
            if sum(1 for c in changes if c["kind"] == "price_new") >= 2:
                break
    for c in changes:
        if c.get("model") in reg:
            c["org"] = reg[c["model"]]["org"]; c["slug"] = reg[c["model"]]["slug"]
        c.update(source="openrouter" if c["board"] == "price" else "arena")
    write_json("changes.json", {"built_at": built_at, "week_to": d1, "prev": d0, "changes": changes,
                                "gap": gap, "webdev_dates": wd})

    # ---- agents
    agent_rows = A["agent"]["overall"]["rows"]
    write_json("agents.json", {"built_at": built_at,
                               "arena_agent": {"publish_date": A["agent"]["overall"]["publish_date"], "rows": agent_rows, **arena_src},
                               "exgentic": exg})

    # ---- sources registry
    sources = [
        {"id": "arena", "name": "Arena (formerly LMArena) leaderboard dataset", "url": "https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset",
         "home": "https://arena.ai/leaderboard", "license": "CC BY 4.0", "license_url": "https://creativecommons.org/licenses/by/4.0/",
         "attribution": "Arena (lmarena-ai), leaderboard-dataset on Hugging Face", "fetched_at": arena["fetched_at"],
         "as_of": A["text"]["overall"]["publish_date"], "used_for": "Human-preference scores: text, WebDev (coding), vision and agent arenas; category boards; history"},
        {"id": "epoch", "name": "Epoch AI Benchmarking Hub", "url": "https://epoch.ai/benchmarks", "home": "https://epoch.ai",
         "license": "CC BY 4.0", "license_url": "https://creativecommons.org/licenses/by/4.0/",
         "attribution": "Epoch AI, 'Capabilities & benchmarking', epoch.ai/benchmarks", "fetched_at": epoch["fetched_at"],
         "as_of": max((r["run_date"] or "") for r in epoch["results"]), "used_for": "Epoch's own runs of GPQA Diamond, SimpleQA Verified, OTIS Mock AIME, FrontierMath Tiers 1-3, SWE-bench Verified"},
        {"id": "openrouter", "name": "OpenRouter models API", "url": "https://openrouter.ai/api/v1/models", "home": "https://openrouter.ai",
         "license": "OpenRouter API terms (cited, prices only)", "license_url": "https://openrouter.ai/terms",
         "attribution": "Source: OpenRouter (openrouter.ai), models API", "fetched_at": prices["fetched_at"], "as_of": prices["as_of"],
         "used_for": "List prices per 1M input/output tokens and context length. Benchmark fields in the API are discarded."},
        {"id": "exgentic", "name": "Open Agent Leaderboard results (Exgentic)", "url": "https://huggingface.co/datasets/Exgentic/results",
         "home": "https://huggingface.co/spaces/open-agent-leaderboard/leaderboard", "license": "CDLA-Permissive-2.0", "license_url": "https://cdla.dev/permissive-2-0/",
         "attribution": "Open Agent Leaderboard (Exgentic), arXiv:2602.22953", "fetched_at": exg["fetched_at"],
         "as_of": (exg.get("dataset_last_modified") or "")[:10], "used_for": "Agent x model success rates and cost per task on 6 agent benchmarks"},
    ]
    write_json("sources.json", {"built_at": built_at, "sources": sources,
                                "blocked": [{"name": "Artificial Analysis", "reason": "Terms forbid use in a competing ranking product. Never used, including when relayed by other APIs."}]})


if __name__ == "__main__":
    main()
