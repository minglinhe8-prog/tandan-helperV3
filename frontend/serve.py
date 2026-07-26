"""Combined server: React SPA + /api proxy to backend"""
import os
import sys
import urllib.request
import urllib.error
import socketserver
import http.server

STATIC_DIR = "I:\\desk\\tandan-helper-master\\frontend\\dist"
BACKEND = "http://localhost:8004"
PORT = 3000


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def handle_one_request(self):
        try:
            super().handle_one_request()
        except (ConnectionResetError, ConnectionAbortedError):
            pass
        finally:
            # 强制关闭连接，避免 keep-alive 卡住
            try:
                self.wfile.flush()
            except Exception:
                pass

    def send_html(self, html_path):
        try:
            with open(html_path, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_error(500, str(e))

    def proxy(self):
        url = BACKEND + self.path
        headers = {}
        for k, v in self.headers.items():
            if k.lower() not in ("host", "connection"):
                headers[k] = v
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length) if length else None
        req = urllib.request.Request(url, data=body, headers=headers)
        req.method = self.command
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                self.send_response(resp.status)
                for k, v in resp.getheaders():
                    if k.lower() not in ("transfer-encoding", "connection"):
                        self.send_header(k, v)
                self.end_headers()
                self.wfile.write(resp.read())
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            self.end_headers()
            self.wfile.write(e.read())
        except Exception as e:
            self.send_error(502, str(e))

    def handle_request(self):
        if self.path.startswith("/api/"):
            return self.proxy()
        # SPA: any non-file route serves index.html
        path = self.path.split("?")[0].lstrip("/")
        index_html = os.path.join(STATIC_DIR, "index.html")
        if not path or path == "":
            return self.send_html(index_html)
        full = os.path.join(STATIC_DIR, path)
        if not os.path.isfile(full):
            return self.send_html(index_html)
        return super().do_GET()

    def do_GET(self):
        self.handle_request()

    def do_POST(self):
        if self.path.startswith("/api/"):
            self.proxy()
        else:
            self.send_error(405)

    def do_DELETE(self):
        if self.path.startswith("/api/"):
            self.proxy()
        else:
            self.send_error(405)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()

    def end_headers(self):
        # 关闭 keep-alive 避免挂起
        self.send_header("Connection", "close")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write(f"{self.command} {self.path} - {args[0] if args else ''}\n")


class ReusableServer(socketserver.TCPServer):
    allow_reuse_address = True


if __name__ == "__main__":
    print(f"Serving on http://localhost:{PORT}")
    print(f"  Static: {STATIC_DIR}")
    print(f"  API proxy -> {BACKEND}")
    sys.stdout.flush()
    ReusableServer(("0.0.0.0", PORT), Handler).serve_forever()