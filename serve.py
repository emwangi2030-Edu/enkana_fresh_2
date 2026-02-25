#!/usr/bin/env python3
"""Local server: serves the main app, /login, /dashboard, and static files."""
import http.server
import os
import urllib.parse

PORT = 8888
ROOT = os.path.dirname(os.path.abspath(__file__))

# Paths that should serve a specific HTML file (path -> file)
ROUTES = {
    "/": "index.html",
    "/login": "login/index.html",
    "/login/": "login/index.html",
    "/dashboard": "dashboard/index.html",
    "/dashboard/": "dashboard/index.html",
}


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlsplit(self.path)
        path = parsed.path.rstrip("/") or "/"
        path_with_slash = path + "/" if path != "/" else "/"

        # Exact route -> serve that HTML
        if path in ROUTES:
            self.serve_file(ROUTES[path])
            return
        if path_with_slash in ROUTES:
            self.serve_file(ROUTES[path_with_slash])
            return

        # Try as file/directory (e.g. /assets/..., /login/, /dashboard/)
        file_path = os.path.join(ROOT, path.lstrip("/"))
        if os.path.isfile(file_path):
            super().do_GET()
            return
        if os.path.isdir(file_path):
            index_in_dir = os.path.join(file_path, "index.html")
            if os.path.isfile(index_in_dir):
                self.serve_file(os.path.relpath(index_in_dir, ROOT))
                return
            super().do_GET()
            return

        # SPA fallback: any other path -> index.html
        self.serve_file("index.html")

    def serve_file(self, rel_path):
        abs_path = os.path.join(ROOT, rel_path)
        if not os.path.isfile(abs_path):
            self.send_error(404)
            return
        with open(abs_path, "rb") as f:
            content = f.read()
        self.send_response(200)
        if rel_path.endswith(".html"):
            self.send_header("Content-Type", "text/html; charset=utf-8")
        elif rel_path.endswith(".css"):
            self.send_header("Content-Type", "text/css; charset=utf-8")
        elif rel_path.endswith(".js"):
            self.send_header("Content-Type", "application/javascript; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)


if __name__ == "__main__":
    with http.server.HTTPServer(("", PORT), Handler) as httpd:
        print(f"Serving at http://localhost:{PORT}/")
        print("  Main site: http://localhost:{}/".format(PORT))
        print("  Login:     http://localhost:{}/login".format(PORT))
        print("  Dashboard: http://localhost:{}/dashboard".format(PORT))
        httpd.serve_forever()
