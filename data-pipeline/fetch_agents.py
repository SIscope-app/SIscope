"""Fetch the Open Agent Leaderboard results (Exgentic), CDLA-Permissive-2.0.

Dataset: https://huggingface.co/datasets/Exgentic/results
"""
import json
import urllib.request

import pandas as pd

from common import CACHE, UA, download, now_iso, write_json

DS = "Exgentic/results"


def main():
    fetched_at = now_iso()
    meta = json.load(urllib.request.urlopen(urllib.request.Request(f"https://huggingface.co/api/datasets/{DS}", headers={"User-Agent": UA}), timeout=60))
    p = download(f"https://huggingface.co/datasets/{DS}/resolve/main/data/train-00000-of-00001.parquet", CACHE / "exgentic_results.parquet")
    df = pd.read_parquet(p)
    rows = []
    for _, r in df.iterrows():
        rows.append({
            "agent": r.agent, "agent_name": r.agent_name,
            "model": r.model_name, "benchmark": r.benchmark, "benchmark_name": r.benchmark_name,
            "subset": None if pd.isna(r.subset_name) else r.subset_name,
            "success": round(float(r.percent_successful), 4) if pd.notna(r.percent_successful) else None,
            "score": round(float(r.benchmark_score), 4) if pd.notna(r.benchmark_score) else None,
            "avg_cost": round(float(r.average_agent_cost), 4) if pd.notna(r.average_agent_cost) else None,
            "sessions": int(r.total_sessions),
            "source": "exgentic", "license": "CDLA-Permissive-2.0", "fetched_at": fetched_at,
        })
    out = {"source": "exgentic", "license": "CDLA-Permissive-2.0", "fetched_at": fetched_at,
           "dataset_last_modified": meta.get("lastModified"), "rows": rows}
    print("agent rows", len(rows))
    write_json("agents_exgentic.json", out)


if __name__ == "__main__":
    main()
