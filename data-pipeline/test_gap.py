"""Displayed gaps use the rounded ratings, and an unchanged gap is not an update."""
import os
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
os.environ.setdefault("SISCOPE_RETRY_SLEEP_S", "0")

from build import gap_change, shown_gap  # noqa: E402


class GapTest(unittest.TestCase):
    def test_gap_matches_the_rounded_operands(self):
        # 1538.4 and 1491.6 display as 1538 and 1492. The gap is 46, not round(46.8)=47.
        self.assertEqual(shown_gap(1538.4, 1491.6), 46)
        self.assertEqual(round(1538.4) - round(1491.6), 46)

    def test_unchanged_rounded_gap_is_not_an_update(self):
        g1 = {"closed": 1538.4, "open": 1491.6}
        g0 = {"closed": 1538.3, "open": 1491.7}
        self.assertIsNone(gap_change(g1, g0, "2026-11-11"))

    def test_a_real_move_uses_the_rounded_points(self):
        item = gap_change({"closed": 1540.4, "open": 1491.6}, {"closed": 1538.4, "open": 1491.6}, "2026-11-12")
        self.assertEqual(item["text"], "Open models 48 points behind")
        self.assertIn("was 46", item["sub"])
        self.assertEqual(item["date"], "2026-11-12")


if __name__ == "__main__":
    unittest.main()
