import http.server
import socketserver
import os
import mimetypes

mimetypes.add_type('application/vnd.android.package-archive', '.apk')

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

print(f"Starting QuietCampus Web Server at http://localhost:{PORT}")
print(f"Serving directory: {DIRECTORY}")

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Server live. Open in browser: http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
