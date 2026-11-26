"""A fetched source file is usable, or it is not. Empty and broken files are not."""
import json
import sys
from pathlib import Path


def source_ok(name: str, doc) -> bool:
    if not isinstance(doc, dict):
        return False
    if name == "arena":
        rows = ((doc.get("boards") or {}).get("text") or {}).get("overall") or {}
        return bool(rows.get("rows"))
    if name == "epoch":
        return bool(doc.get("results")) and bool(doc.get("benchmarks"))
    if name == "openrouter":
        return bool(doc.get("models"))
    if name == "exgentic":
        return bool(doc.get("rows"))
    return False


def main() -> int:
    name, path = sys.argv[1], sys.argv[2]
    try:
        doc = json.loads(Path(path).read_text())
    except (OSError, json.JSONDecodeError) as exc:
        print(f"{name} snapshot is not readable JSON: {exc}")
        return 1
    if not source_ok(name, doc):
        print(f"{name} snapshot is missing the rows this site builds from.")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
