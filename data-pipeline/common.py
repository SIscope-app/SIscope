"""Shared helpers for the SIscope data pipeline.

Every output record carries `source`, `license` and `fetched_at` so that
provenance travels with the number wherever it is shown.
"""
from __future__ import annotations

import datetime as dt
import json
import os
import re
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CACHE = ROOT / ".cache"
OUT = ROOT.parent / "data"
CACHE.mkdir(exist_ok=True)
OUT.mkdir(exist_ok=True)

UA = "SIscope-data-pipeline/0.1 (+https://siscope.app/about)"

# Hard block list. Any record whose origin mentions these is dropped.
BLOCKED_ORIGINS = ("artificial_analysis", "artificial-analysis", "artificialanalysis", "artificial analysis")

# Retry only blips. Auth failures, missing files, and blocked-content errors are not retried.
TRANSIENT_HTTP = frozenset({408, 429, 500, 502, 503, 504})
RETRY_ATTEMPTS = 3


def is_transient_http(code: int) -> bool:
    return code in TRANSIENT_HTTP


def _retry_pause(failed_attempts: int) -> None:
    raw = os.environ.get("SISCOPE_RETRY_SLEEP_S")
    if raw is not None and raw != "":
        time.sleep(float(raw))
        return
    time.sleep(min(2 ** failed_attempts, 16))


def read_url(url: str, timeout: float = 120, attempts: int = RETRY_ATTEMPTS) -> bytes:
    """GET a URL. Retries a bounded number of times, and only for transient failures."""
    last: Exception | None = None
    for i in range(attempts):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            last = e
            if not is_transient_http(e.code):
                raise
        except (urllib.error.URLError, TimeoutError, ConnectionError, OSError) as e:
            last = e
        if i + 1 == attempts:
            break
        print(f"transient fetch failure ({i + 1}/{attempts}) {url}: {last}", flush=True)
        _retry_pause(i)
    raise SystemExit(f"download failed after {attempts} attempts: {url}: {last}")


def read_json_url(url: str, timeout: float = 60):
    return json.loads(read_url(url, timeout=timeout))


def now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def download(url: str, dest: Path, max_age_h: float = 6) -> Path:
    """Download url to dest unless a fresh copy is cached. SISCOPE_CACHE_H=0 forces a fresh download,
    so `fetched_at` always means what it says on a real refresh.

    A failed attempt never leaves a partial file in place. Only transient HTTP and
    network errors are retried, at most RETRY_ATTEMPTS times.
    """
    max_age_h = float(os.environ.get("SISCOPE_CACHE_H", max_age_h))
    if dest.exists() and (dt.datetime.now().timestamp() - dest.stat().st_mtime) < max_age_h * 3600:
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_name(dest.name + ".part")
    last: Exception | None = None
    for i in range(RETRY_ATTEMPTS):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=120) as r, open(tmp, "wb") as f:
                while True:
                    chunk = r.read(1 << 20)
                    if not chunk:
                        break
                    f.write(chunk)
            tmp.replace(dest)
            return dest
        except urllib.error.HTTPError as e:
            last = e
            tmp.unlink(missing_ok=True)
            if not is_transient_http(e.code):
                raise
        except (urllib.error.URLError, TimeoutError, ConnectionError, OSError) as e:
            last = e
            tmp.unlink(missing_ok=True)
        if i + 1 == RETRY_ATTEMPTS:
            break
        print(f"transient download failure ({i + 1}/{RETRY_ATTEMPTS}) {url}: {last}", flush=True)
        _retry_pause(i)
    raise SystemExit(f"download failed after {RETRY_ATTEMPTS} attempts: {url}: {last}")


def write_json(name: str, obj) -> None:
    p = OUT / name
    with open(p, "w") as f:
        json.dump(obj, f, indent=1, ensure_ascii=False, default=str)
        f.write("\n")
    print(f"wrote {p.relative_to(OUT.parent)} ({p.stat().st_size/1024:.0f} KB)")


def read_json(name: str):
    with open(OUT / name) as f:
        return json.load(f)


def assert_no_blocked(obj, where: str) -> None:
    s = json.dumps(obj, default=str).lower()
    for b in BLOCKED_ORIGINS:
        if b in s:
            raise SystemExit(f"BLOCKED origin '{b}' found in {where}; refusing to write.")


DATE_RX = re.compile(r"(\b|[-_ ])(20\d{2}[-_]?\d{2}[-_]?\d{2}|\d{6}|\d{4}(?=$))(\b|$)")


def base_key(name: str) -> str:
    """Normalise a model name to a comparable key: no vendor prefix, variant, dates or punctuation."""
    n = name.lower()
    if ":" in n and not n.startswith("http"):
        n = n.split(":", 1)[1] if len(n.split(":", 1)[0]) < 24 else n
    n = re.sub(r"\(.*?\)", " ", n)
    n = n.split("/")[-1]
    n = re.sub(r"[-_ ](20\d{2})[-_]?(\d{2})[-_]?(\d{2})\b", " ", n)
    n = re.sub(r"[-_ ]\d{6}\b", " ", n)
    n = n.replace("preview", " preview ")
    return re.sub(r"[^a-z0-9]+", "", n)


EFFORTS = ["xhigh", "max", "high", "medium", "low", "minimal", "none"]


def effort_of(variant: str | None) -> str | None:
    if not variant:
        return None
    v = variant.lower()
    for e in EFFORTS:
        if re.search(rf"\b{e}\b", v):
            return e
    return None


def slugify(name: str) -> str:
    s = name.lower()
    s = re.sub(r"[()]+", " ", s)
    s = re.sub(r"[^a-z0-9.]+", "-", s)
    s = s.replace(".", "-")
    return re.sub(r"-+", "-", s).strip("-")


def split_name(name: str) -> tuple[str, str | None]:
    m = re.match(r"^(.*?) \((.*)\)$", name)
    return (m.group(1), m.group(2)) if m else (name, None)
