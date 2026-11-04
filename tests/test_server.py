"""Run: python tests/test_server.py. No external dependencies."""
import importlib.util
import mimetypes
from pathlib import Path
import re
import tempfile
import shutil
import threading
import unittest
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('kotobapath_start', ROOT / 'start.py')
launcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(launcher)


class ServerTest(unittest.TestCase):
    def test_assets_with_broken_system_mime(self):
        old = dict(mimetypes.types_map)
        # Reproduce a wrong Windows MIME association without changing the OS.
        mimetypes.add_type('text/plain', '.css')
        mimetypes.add_type('application/octet-stream', '.js')
        with tempfile.TemporaryDirectory(prefix='kotoba test ') as tmp:
            root = Path(tmp) / '日语课程'
            shutil.copytree(ROOT, root, ignore=shutil.ignore_patterns('__pycache__'))
            server = launcher.make_server(root, ('127.0.0.1', 0))
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            base = 'http://127.0.0.1:%d/' % server.server_port
            try:
                with urlopen(base) as response:
                    source = response.read().decode('utf-8')
                    self.assertEqual(response.headers.get_content_type(), 'text/html')
                resources = re.findall(r'(?:src|href)="([^"#]+)"', source)
                for asset in resources:
                    if asset.startswith('http'):
                        continue
                    with self.subTest(asset=asset), urlopen(base + asset) as response:
                        self.assertEqual(response.status, 200)
                        self.assertTrue(response.read())
                        self.assertIn('no-store', response.headers['Cache-Control'])
                        expected = ('text/css' if asset.startswith('style.css') else
                                    'text/javascript' if '.js' in asset else 'image/svg+xml')
                        self.assertEqual(response.headers.get_content_type(), expected)
                with urlopen(base + 'style.css?v=1.0.1') as response:
                    self.assertEqual(response.read(), (root / 'style.css').read_bytes())
                with urlopen(base + 'data/inventory.json') as response:
                    self.assertEqual(response.headers.get_content_type(), 'application/json')
            finally:
                server.shutdown()
                server.server_close()
                thread.join()
                mimetypes.types_map.clear()
                mimetypes.types_map.update(old)

    def test_missing_scheduled_asset_fails_clearly(self):
        with tempfile.TemporaryDirectory(prefix='kotoba incomplete ') as tmp:
            root = Path(tmp) / 'project'
            shutil.copytree(ROOT, root, ignore=shutil.ignore_patterns('__pycache__'))
            (root / 'data/expansion-v1.4.js').unlink()
            with self.assertRaisesRegex(FileNotFoundError, 'expansion-v1.4.js'):
                launcher.make_server(root, ('127.0.0.1', 0))

    def test_missing_files_fail_clearly(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaisesRegex(FileNotFoundError, 'style.css'):
                launcher.make_server(tmp, ('127.0.0.1', 0))


if __name__ == '__main__':
    unittest.main()
