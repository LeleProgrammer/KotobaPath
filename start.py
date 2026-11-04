"""Optional stable-origin local preview. Python 3.8+, no packages required."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from functools import partial
import threading
import webbrowser

root = Path(__file__).resolve().parent
address = ('127.0.0.1', 8765)
try:
    server = ThreadingHTTPServer(address, partial(SimpleHTTPRequestHandler, directory=str(root)))
except OSError as exc:
    print('Port 8765 is unavailable. Close another copy of this launcher and retry.')
    print(exc)
    input('Press Enter to exit...')
    raise SystemExit(1)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
print('KotobaPath: http://127.0.0.1:8765/')
print('Keep this window open. Press Ctrl+C to stop.')
webbrowser.open('http://127.0.0.1:8765/')
try:
    thread.join()
except KeyboardInterrupt:
    server.shutdown()
    server.server_close()
