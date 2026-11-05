"""Stable-origin local static server. Python 3.8+, no packages required."""
import argparse
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import webbrowser

ROOT = Path(__file__).resolve().parent
ADDRESS = ('127.0.0.1', 8765)


class StaticHandler(SimpleHTTPRequestHandler):
    # Windows registry associations can override Python's global MIME database.
    # Browser stylesheets and scripts must use their web MIME types regardless.
    extensions_map = dict(SimpleHTTPRequestHandler.extensions_map, **{
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.mjs': 'text/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.svg': 'image/svg+xml',
    })

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()


def make_server(root=ROOT, address=ADDRESS):
    root = Path(root).resolve()
    required = ['index.html', 'style.css', 'app.js', 'data/vocab.js',
                'data/grammar.js', 'data/kanji.js', 'data/foundation.js',
                'data/readings.js', 'data/blanks.js', 'data/orders.js',
                'data/writing.js', 'data/expansion.js', 'sync-core.js']
    class AssetParser(HTMLParser):
        def handle_starttag(self, tag, attrs):
            attr = dict(attrs)
            ref = attr.get('src') if tag == 'script' else attr.get('href') if tag == 'link' else None
            if ref:
                url = urlsplit(ref)
                if not url.scheme and not url.netloc and url.path:
                    target = (root / unquote(url.path).lstrip('/')).resolve()
                    try:
                        target.relative_to(root)
                    except ValueError:
                        raise ValueError('Asset path must remain inside the project: ' + ref)
                    required.append(str(target.relative_to(root)))
    if (root / 'index.html').is_file():
        AssetParser().feed((root / 'index.html').read_text(encoding='utf-8'))
    missing = [name for name in dict.fromkeys(required) if not (root / name).is_file()]
    if missing:
        raise FileNotFoundError('Extract the entire ZIP first. Missing: ' + ', '.join(missing))
    handler = partial(StaticHandler, directory=str(root))
    return ThreadingHTTPServer(address, handler)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--no-browser', action='store_true', help='Do not open a browser automatically')
    args = parser.parse_args()
    try:
        server = make_server()
    except (OSError, FileNotFoundError) as exc:
        print('Could not start KotobaPath:', exc)
        print('Extract the full package and close the previous launcher using port 8765, then retry.')
        return 1
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    url = 'http://127.0.0.1:8765/'
    print('KotobaPath 1.6.0:', url, flush=True)
    print('Keep this window open. Press Ctrl+C to stop.', flush=True)
    if not args.no_browser:
        webbrowser.open(url)
    try:
        thread.join()
    except KeyboardInterrupt:
        pass
    finally:
        server.shutdown()
        server.server_close()
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
