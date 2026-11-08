"""Bounded retries: transient HTTP is retried, other HTTP errors are not."""
import os
import sys
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
os.environ["SISCOPE_RETRY_SLEEP_S"] = "0"

from common import download, is_transient_http, read_url  # noqa: E402


class Handler(BaseHTTPRequestHandler):
    state = {"n": 0, "mode": "flaky", "body": b"ok"}

    def do_GET(self):
        self.state["n"] += 1
        mode = self.state["mode"]
        if mode == "flaky" and self.state["n"] < 3:
            self.send_response(503)
            self.end_headers()
            return
        if mode == "missing":
            self.send_response(404)
            self.end_headers()
            return
        body = self.state["body"]
        self.send_response(200)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        return


class RetryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.httpd = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        cls.port = cls.httpd.server_address[1]
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()

    def setUp(self):
        Handler.state["n"] = 0
        Handler.state["mode"] = "flaky"
        Handler.state["body"] = b"payload"

    def url(self):
        return f"http://127.0.0.1:{self.port}/file"

    def test_transient_codes(self):
        self.assertTrue(is_transient_http(503))
        self.assertTrue(is_transient_http(429))
        self.assertFalse(is_transient_http(404))
        self.assertFalse(is_transient_http(401))

    def test_retries_503_then_reads_body(self):
        body = read_url(self.url(), timeout=5)
        self.assertEqual(body, b"payload")
        self.assertEqual(Handler.state["n"], 3)

    def test_does_not_retry_404(self):
        Handler.state["mode"] = "missing"
        with self.assertRaises(Exception):
            read_url(self.url(), timeout=5)
        self.assertEqual(Handler.state["n"], 1)

    def test_download_replaces_only_after_success(self):
        dest = Path(self.id().replace(".", "_") + ".bin")
        part = dest.with_name(dest.name + ".part")
        try:
            download(self.url(), dest, max_age_h=0)
            self.assertEqual(dest.read_bytes(), b"payload")
            self.assertFalse(part.exists())
        finally:
            dest.unlink(missing_ok=True)
            part.unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()
