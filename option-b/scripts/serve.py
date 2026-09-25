"""Serve the dashboard folder over HTTP for local use.

`python -m http.server` accepts only 5 waiting connections. The page loads about
30 files at once (ES modules and data/*.json), so some are refused and the page
hangs on "Loading data". This server takes a longer queue.

    python3 scripts/serve.py            # http://localhost:8000/
    python3 scripts/serve.py 8001       # another port

Standard library only.
"""
import functools
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class Server(ThreadingHTTPServer):
    request_queue_size = 128
    daemon_threads = True


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    handler = functools.partial(SimpleHTTPRequestHandler, directory=str(ROOT))
    with Server(("", port), handler) as httpd:
        print(f"serving {ROOT.name}/ on http://localhost:{port}/  (v2: http://localhost:{port}/index2.html)")
        print("stop with Ctrl+C")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
