"""Price-match keys must not merge models that differ by a plus."""
import os
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
os.environ.setdefault("SISCOPE_RETRY_SLEEP_S", "0")

from common import base_key, slugify  # noqa: E402


class BaseKeyTest(unittest.TestCase):
    def test_plus_is_a_different_model(self):
        self.assertNotEqual(base_key("Command R+"), base_key("Command R"))
        self.assertNotEqual(base_key("Cohere: Command A+"), base_key("Cohere: Command A"))
        self.assertEqual(base_key("Command R+"), base_key("Command R Plus"))

    def test_plus_is_a_word_in_the_slug(self):
        self.assertEqual(slugify("Command R+"), "command-r-plus")
        self.assertEqual(slugify("Command R"), "command-r")
        self.assertEqual(slugify("Command R+ (08-2024)"), "command-r-plus-08-2024")
        self.assertEqual(slugify("Command R (08-2024)"), "command-r-08-2024")
        self.assertNotEqual(slugify("Command R+"), slugify("Command R"))

    def test_dates_and_vendor_prefix_still_drop(self):
        self.assertEqual(base_key("OpenAI: GPT-4o (2024-08-06)"), base_key("gpt-4o"))
        self.assertNotEqual(base_key("GPT-4o mini"), base_key("GPT-4o"))


if __name__ == "__main__":
    unittest.main()
