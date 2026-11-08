"""Fetch Epoch AI Benchmarking Hub data (CC BY 4.0).

Only Epoch's *own* evaluation runs are imported (files without the `_external`
suffix). External rows keep their original licences, so we skip them in v0.
"""
import zipfile

import pandas as pd

from common import CACHE, download, now_iso, write_json

URL = "https://epoch.ai/data/benchmark_data.zip"
# benchmark id -> (file, label, category, what it measures)
BENCHES = {
    "gpqa_diamond": ("gpqa_diamond.csv", "GPQA Diamond", "reasoning", "PhD-level science multiple choice questions"),
    "simpleqa_verified": ("simpleqa_verified.csv", "SimpleQA Verified", "reasoning", "Short factual questions; rewards not making things up"),
    "otis_mock_aime": ("otis_mock_aime_2024_2025.csv", "OTIS Mock AIME 2024-25", "math", "Competition maths problems in the style of AIME"),
    "frontiermath": ("frontiermath_tiers_1_3_v2.csv", "FrontierMath Tiers 1-3", "math", "Very hard, unpublished research-style maths problems"),
    "swe_bench_verified": ("swe_bench_verified.csv", "SWE-bench Verified", "coding", "Fixing real GitHub issues in Python repositories"),
}


def main():
    fetched_at = now_iso()
    z = download(URL, CACHE / "epoch_benchmark_data.zip")
    d = CACHE / "epoch"
    d.mkdir(exist_ok=True)
    zipfile.ZipFile(z).extractall(d)
    meta = pd.read_csv(d / "benchmark_metadata.csv")
    out = {"source": "epoch", "license": "CC-BY-4.0", "fetched_at": fetched_at, "benchmarks": {}, "results": []}
    for bid, (fn, label, cat, desc) in BENCHES.items():
        df = pd.read_csv(d / fn)
        m = meta[meta.source_file == fn]
        baseline = float(m.random_baseline.iloc[0]) if len(m) else 0.0
        out["benchmarks"][bid] = {"label": label, "category": cat, "description": desc, "random_baseline": baseline,
                                  "url": "https://epoch.ai/benchmarks", "n": int(len(df))}
        for _, r in df.iterrows():
            if pd.isna(r["Model version"]):
                continue
            score = r.get("Best score (across scorers)", r.get("mean_score"))
            if pd.isna(score):
                continue
            out["results"].append({
                "benchmark": bid,
                "model_version": str(r["Model version"]).strip(),
                "org": None if pd.isna(r.get("Organization")) else str(r["Organization"]),
                "score": round(float(score), 4),
                "stderr": None if pd.isna(r.get("stderr")) else round(float(r["stderr"]), 4),
                "run_date": None if pd.isna(r.get("Started at")) else str(r["Started at"])[:10],
                "log_url": None if pd.isna(r.get("Log viewer")) else str(r["Log viewer"]),
                "source": "epoch", "license": "CC-BY-4.0", "fetched_at": fetched_at,
            })
    print("epoch results", len(out["results"]))
    write_json("epoch.json", out)


if __name__ == "__main__":
    main()
