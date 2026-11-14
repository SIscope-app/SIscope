"""Fetch the official Arena (formerly LMArena) leaderboard dataset from Hugging Face.

Dataset: https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset
License: CC BY 4.0 (dataset card). Per-row `license` is the *model's* license.
"""
import pandas as pd

from common import CACHE, download, now_iso, read_json_url, split_name, write_json

DS = "lmarena-ai/leaderboard-dataset"
BASE = f"https://huggingface.co/datasets/{DS}/resolve/main"
BOARDS = {
    "text": ["overall", "coding", "math", "creative_writing", "instruction_following", "hard_prompts", "multi_turn", "longer_query", "non_english"],
    "webdev": ["overall"],
    "vision": ["overall"],
    "agent": ["overall"],
}
HISTORY = {"text": "overall", "webdev": "overall"}


def prefer_row(prev: dict, row: dict) -> dict:
    """Two published rows for one model: keep the one with more votes (or agent sessions).

    File order is not a measurement. A larger sample is. Equal samples keep the better rank.
    """
    prev_n = prev.get("votes") if prev.get("votes") is not None else prev.get("sessions") or 0
    row_n = row.get("votes") if row.get("votes") is not None else row.get("sessions") or 0
    if row_n > prev_n:
        return row
    if row_n == prev_n and row["rank"] < prev["rank"]:
        return row
    return prev


def collapse_rows(rows: list[dict]) -> list[dict]:
    by_name: dict[str, dict] = {}
    for row in rows:
        prev = by_name.get(row["name"])
        by_name[row["name"]] = row if prev is None else prefer_row(prev, row)
    return sorted(by_name.values(), key=lambda r: r["rank"])


def main():
    fetched_at = now_iso()
    meta = read_json_url(f"https://huggingface.co/api/datasets/{DS}", timeout=60)
    license_ = (meta.get("cardData") or {}).get("license", "cc-by-4.0")
    out = {
        "source": "arena",
        "license": "CC-BY-4.0" if license_.lower() == "cc-by-4.0" else license_,
        "fetched_at": fetched_at,
        "dataset_sha": meta.get("sha"),
        "dataset_last_modified": meta.get("lastModified"),
        "boards": {},
        "history": {},
    }
    for board, cats in BOARDS.items():
        p = download(f"{BASE}/{board}/latest-00000-of-00001.parquet", CACHE / f"arena_{board}_latest.parquet")
        df = pd.read_parquet(p)
        b = {}
        for cat in cats:
            d = df[df.category == cat].sort_values("rank")
            rows = []
            for _, r in d.iterrows():
                base, variant = split_name(r.model_name)
                row = {
                    "name": r.model_name,
                    "org": r.organization or "",
                    "model_license": r.license or "",
                    "rank": int(r["rank"]),
                    "date": str(r.leaderboard_publish_date),
                }
                if board == "agent":
                    row.update(score=round(float(r.score), 4), lo=round(float(r.score_ci_lower), 4), hi=round(float(r.score_ci_upper), 4),
                               sessions=int(r.session_count) if pd.notna(r.session_count) else None,
                               cost_per_task_p50=round(float(r.cost_per_task_p50), 3) if pd.notna(r.cost_per_task_p50) else None)
                else:
                    row.update(rating=round(float(r.rating), 1), lo=round(float(r.rating_lower), 1), hi=round(float(r.rating_upper), 1),
                               votes=int(r.vote_count) if pd.notna(r.vote_count) else None)
                rows.append(row)
            rows = collapse_rows(rows)
            b[cat] = {"publish_date": max((x["date"] for x in rows), default=None), "rows": rows}
        out["boards"][board] = b
        print(board, {c: len(v["rows"]) for c, v in b.items()})
    for board, cat in HISTORY.items():
        p = download(f"{BASE}/{board}/full-00000-of-00001.parquet", CACHE / f"arena_{board}_full.parquet")
        f = pd.read_parquet(p, columns=["model_name", "license", "rating", "rank", "category", "leaderboard_publish_date", "vote_count"])
        f = f[f.category == cat]
        # One row per model per date. Keep the larger vote sample.
        f = f.sort_values("vote_count", ascending=False).drop_duplicates(["model_name", "leaderboard_publish_date"])
        dates = sorted(f.leaderboard_publish_date.astype(str).unique())[-16:]
        f = f[f.leaderboard_publish_date.astype(str).isin(dates)]
        hist = {}
        for name, g in f.groupby("model_name"):
            g = g.sort_values("leaderboard_publish_date")
            hist[name] = [[str(d), round(float(x), 1), int(rk)] for d, x, rk in zip(g.leaderboard_publish_date, g.rating, g["rank"])]
        gap = []
        for d in dates:
            x = f[f.leaderboard_publish_date.astype(str) == d]
            is_open = x.license.fillna("").str.strip().str.lower().apply(lambda v: v not in ("proprietary", "", "-", "unknown", "n/a")) & ~x.model_name.isin(["Qwen-Max (0919)"])  # API-only, mislabelled "Qwen" licence
            closed = x[~is_open]
            opn = x[is_open]
            gap.append({"d": d, "closed": round(float(closed.rating.max()), 1) if len(closed) else None,
                        "closed_name": closed.sort_values("rating").model_name.iloc[-1] if len(closed) else None,
                        "open": round(float(opn.rating.max()), 1) if len(opn) else None,
                        "open_name": opn.sort_values("rating").model_name.iloc[-1] if len(opn) else None})
        out["history"][board] = {"dates": dates, "series": hist, "gap": gap}
    write_json("arena.json", out)


if __name__ == "__main__":
    main()
