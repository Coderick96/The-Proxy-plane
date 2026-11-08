import base64
import json
import logging
from threading import Lock
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from renderer import CardArtRenderer

HOST = "127.0.0.1"
PORT = 8765
ORIGIN = f"http://{HOST}:{PORT}"
ROOT = Path(__file__).resolve().parent
renderer = CardArtRenderer()
busy = Lock()


class Handler(BaseHTTPRequestHandler):
    def _headers(self, status, content_type):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()

    def _error(self, status, message):
        self._headers(status, "application/json")
        self.wfile.write(json.dumps({"error": message}).encode())

    def _event(self, data):
        self.wfile.write((json.dumps(data) + "\n").encode())
        self.wfile.flush()

    def do_GET(self):
        if self.path != "/":
            return self._error(404, "Page unavailable.")
        self._headers(200, "text/html; charset=utf-8")
        self.wfile.write((ROOT / "index.html").read_bytes())

    def do_POST(self):
        if self.path != "/generate":
            return self._error(404, "Endpoint unavailable.")
        if self.headers.get("Host") != f"{HOST}:{PORT}" or self.headers.get("Origin") not in (None, ORIGIN):
            return self._error(403, "Open the renderer on its local address.")
        if self.headers.get_content_type() != "application/json":
            return self._error(415, "Expected application/json.")
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= 8192:
                raise ValueError("Invalid request size.")
            data = json.loads(self.rfile.read(size))
            if not isinstance(data, dict):
                raise ValueError("Expected a JSON object.")
            candidates = renderer.generate(data.get("prompt"), data.get("layout", "portrait"))
        except (ValueError, UnicodeError) as error:
            return self._error(400, str(error))

        if not busy.acquire(blocking=False):
            return self._error(409, "A generation is already running on this machine.")
        try:
            self._headers(200, "application/x-ndjson")
            for seed, original, card in candidates:
                self._event({
                    "seed": seed,
                    "original": base64.b64encode(original).decode("ascii"),
                    "card": base64.b64encode(card).decode("ascii"),
                })
            self._event({"done": True})
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception:
            logging.exception("Local generation failed")
            try:
                self._event({"error": "Generation failed. Check the local terminal for details."})
            except (BrokenPipeError, ConnectionResetError):
                pass
        finally:
            candidates.close()
            busy.release()


if __name__ == "__main__":
    with ThreadingHTTPServer((HOST, PORT), Handler) as server:
        print(f"Open {ORIGIN} in your browser.", flush=True)
        server.serve_forever()

