"""
serve.py — runs BridgeMUN on your own computer while you work on it.

Start it with:   python3 serve.py
Then open:       http://localhost:8123/login.html

It is the same as "python3 -m http.server 8123", with one difference: it
tells the browser never to keep old copies of the files. Without that, a
normal refresh can keep running yesterday's JavaScript after it has been
edited, which makes fixes look like they did not work.
"""

import http.server


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    http.server.test(HandlerClass=NoCacheHandler, port=8123)
