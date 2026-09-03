#!/usr/bin/env python3
"""
LunaAlign AI - High Performance Local Development Server
Serves the SIH26166 Lunar Image Registration Dashboard
Listens on port 8080 (as configured in .vscode/launch.json)
and concurrently on port 3000 for maximum developer convenience.
"""

import os
import sys
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT_PRIMARY = 8080
PORT_SECONDARY = 3000

class DevRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS and disable aggressive caching for seamless live frontend dev
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def log_message(self, format, *args):
        # Clean formatted telemetry logs
        sys.stderr.write(f"[{self.log_date_time_string()}] {format % args}\n")

def run_server(port):
    try:
        server = HTTPServer(('0.0.0.0', port), DevRequestHandler)
        print(f"✔ LunaAlign AI Frontend active at: http://localhost:{port}")
        server.serve_forever()
    except Exception as e:
        print(f"Notice on port {port}: {e}", file=sys.stderr)

if __name__ == '__main__':
    workspace_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(workspace_dir)
    print(f"Serving LunaAlign AI directory: {workspace_dir}")
    print("------------------------------------------------------------")

    # Start secondary port 3000 in background thread
    t = threading.Thread(target=run_server, args=(PORT_SECONDARY,), daemon=True)
    t.start()

    # Start primary port 8080 in main thread
    run_server(PORT_PRIMARY)
