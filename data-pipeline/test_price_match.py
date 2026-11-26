"""Arena date suffixes match an OpenRouter id or its created date, and nothing else."""
import datetime as dt
import os
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
os.environ.setdefault("SISCOPE_RETRY_SLEEP_S", "0")

from price_match import match_price  # noqa: E402


def created(ymd: str) -> int:
    return int(dt.datetime.strptime(ymd, "%Y%m%d").replace(tzinfo=dt.timezone.utc).timestamp())


CATALOG = [
    {"id": "deepseek/deepseek-v4.1-flash", "name": "DeepSeek: DeepSeek V4.1 Flash", "created": created("20260910")},
    {"id": "deepseek/deepseek-v4.1-flash-1017", "name": "DeepSeek: DeepSeek V4.1 Flash", "created": created("20261017")},
    {"id": "deepseek/deepseek-v4-pro", "name": "DeepSeek: DeepSeek V4 Pro", "created": created("20260101")},
    {"id": "deepseek/deepseek-v4-pro-0813", "name": "DeepSeek: DeepSeek V4 Pro", "created": created("20260813")},
    {"id": "x-ai/grok-4.20", "name": "xAI: Grok 4.20", "created": created("20261101")},
    {"id": "x-ai/grok-4", "name": "xAI: Grok 4", "created": created("20260101")},
    {"id": "x-ai/grok-4.1", "name": "xAI: Grok 4.1", "created": created("20260201")},
    {"id": "x-ai/grok-4-0420", "name": "xAI: Grok 4", "created": created("20260420")},
]


class PriceMatchTest(unittest.TestCase):
    def test_known_snapshots(self):
        self.assertEqual(match_price("DeepSeek V4.1 Flash 20260910", CATALOG)["id"], "deepseek/deepseek-v4.1-flash")
        self.assertEqual(match_price("DeepSeek V4.1 Flash 20261017", CATALOG)["id"], "deepseek/deepseek-v4.1-flash-1017")
        self.assertEqual(match_price("DeepSeek V4 Pro 20260813", CATALOG)["id"], "deepseek/deepseek-v4-pro-0813")
        self.assertEqual(match_price("Grok 4.20", CATALOG)["id"], "x-ai/grok-4.20")

    def test_no_false_matches(self):
        self.assertNotEqual(match_price("DeepSeek V4.1 Flash 20261017", CATALOG)["id"], "deepseek/deepseek-v4.1-flash")
        self.assertNotEqual(match_price("DeepSeek V4 Pro 20260813", CATALOG)["id"], "deepseek/deepseek-v4-pro")
        self.assertEqual(match_price("Grok 4.20", CATALOG)["id"], "x-ai/grok-4.20")
        self.assertIsNone(match_price("Grok 4.20 20260101", CATALOG))
        self.assertIsNone(match_price("Missing model", CATALOG))
        self.assertNotEqual((match_price("Grok 4", CATALOG) or {}).get("id"), "x-ai/grok-4.20")


if __name__ == "__main__":
    unittest.main()
