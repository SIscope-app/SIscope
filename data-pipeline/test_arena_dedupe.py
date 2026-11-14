"""Duplicate Arena rows and repeated Epoch runs resolve by a stated rule, not file order."""
import os
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
os.environ.setdefault("SISCOPE_RETRY_SLEEP_S", "0")

from epoch_match import pick_latest  # noqa: E402
from fetch_arena import collapse_rows, prefer_row  # noqa: E402


class ArenaDedupeTest(unittest.TestCase):
    def test_more_votes_wins_even_if_it_is_listed_first(self):
        low = {"name": "GPT-5.3-Codex (Codex Harness)", "rank": 116, "votes": 3626, "rating": 1371.4}
        high = {"name": "GPT-5.3-Codex (Codex Harness)", "rank": 101, "votes": 2629, "rating": 1405.8}
        self.assertEqual(prefer_row(high, low)["rank"], 116)
        self.assertEqual(prefer_row(low, high)["rank"], 116)
        rows = collapse_rows([high, low, {"name": "Other", "rank": 1, "votes": 10}])
        self.assertEqual([r["name"] for r in rows], ["Other", "GPT-5.3-Codex (Codex Harness)"])
        self.assertEqual(rows[1]["votes"], 3626)

    def test_equal_votes_keep_the_better_rank(self):
        a = {"name": "M", "rank": 4, "votes": 100}
        b = {"name": "M", "rank": 2, "votes": 100}
        self.assertEqual(prefer_row(a, b)["rank"], 2)


class EpochPickTest(unittest.TestCase):
    def test_later_run_replaces_an_earlier_one(self):
        early = {"model_version": "claude-opus-4-6", "score": 0.7872, "run_date": "2026-02-18"}
        later_file_older_run = {"model_version": "claude-opus-4-6", "score": 0.7562, "run_date": "2026-02-10"}
        self.assertEqual(pick_latest([early, later_file_older_run])["score"], 0.7872)
        self.assertEqual(pick_latest([later_file_older_run, early])["score"], 0.7872)


if __name__ == "__main__":
    unittest.main()
