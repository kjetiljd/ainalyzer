"""HTTP server for serving analysis results."""
import http.server
import socketserver
import urllib.parse
import webbrowser
import json
from pathlib import Path


def create_request_handler(frontend_dir, analysis_dir):
    """Create a request handler class for the aina server.

    Args:
        frontend_dir: Path to frontend/dist directory
        analysis_dir: Path to ~/.aina/analysis directory

    Returns:
        Request handler class
    """
    class AinaRequestHandler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(frontend_dir), **kwargs)

        def do_GET(self):
            parsed = urllib.parse.urlparse(self.path)
            path = parsed.path
            query = urllib.parse.parse_qs(parsed.query)

            if path.startswith('/api/analyses'):
                self.handle_analyses(path)
            elif path == '/api/file':
                self.handle_file(query)
            elif path == '/api/clocignore':
                self.handle_clocignore(query)
            else:
                super().do_GET()

        def handle_analyses(self, path):
            """Serve analysis JSON files from ~/.aina/analysis/"""
            file_path = path.replace('/api/analyses', '') or '/index.json'
            if file_path.startswith('/'):
                file_path = file_path[1:]
            if not file_path:
                file_path = 'index.json'

            target = analysis_dir / file_path

            if not target.exists():
                self.send_error(404, 'Not found')
                return

            try:
                content = target.read_text()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(content.encode())
            except Exception as e:
                self.send_error(500, f'Error reading file: {e}')

        def handle_file(self, query):
            """Serve file content with path validation."""
            file_path = query.get('path', [None])[0]
            root_path = query.get('root', [None])[0]

            if not file_path or not root_path:
                self.send_json_error(400, 'Missing path or root parameter')
                return

            resolved_root = Path(root_path).resolve()
            resolved_file = (resolved_root / file_path).resolve()

            if not str(resolved_file).startswith(str(resolved_root) + '/'):
                self.send_json_error(403, 'Path outside analysis root')
                return

            if not resolved_file.exists():
                self.send_json_error(404, 'File not found')
                return

            try:
                content = resolved_file.read_text()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'content': content, 'path': file_path}).encode())
            except Exception as e:
                self.send_json_error(500, f'Error reading file: {e}')

        def handle_clocignore(self, query):
            """Serve merged .clocignore from analysis root_path and all repos."""
            analysis_name = query.get('analysis', [None])[0]

            if not analysis_name:
                self.send_json_error(400, 'Missing analysis parameter')
                return

            analysis_path = analysis_dir / f'{analysis_name}.json'
            if not analysis_path.exists():
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Analysis not found', 'content': ''}).encode())
                return

            try:
                analysis_json = json.loads(analysis_path.read_text())
                root_path = Path(analysis_json['root_path'])

                all_patterns = []

                if not root_path.exists():
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({'content': ''}).encode())
                    return

                def add_patterns_from(file_path, prefix=''):
                    if file_path.exists():
                        for line in file_path.read_text().split('\n'):
                            line = line.strip()
                            if line and not line.startswith('#'):
                                if prefix:
                                    all_patterns.append(f'{prefix}/{line}')
                                else:
                                    all_patterns.append(line)

                add_patterns_from(root_path / '.clocignore')

                for entry in root_path.iterdir():
                    if entry.is_dir() and not entry.name.startswith('.'):
                        add_patterns_from(entry / '.clocignore', entry.name)

                content = '\n'.join(all_patterns)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'content': content}).encode())
            except Exception as e:
                self.send_json_error(500, f'Error reading clocignore: {e}')

        def send_json_error(self, code, message):
            """Send JSON error response."""
            self.send_response(code)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': message}).encode())

        def log_message(self, format, *args):
            """Suppress default logging."""
            pass

    return AinaRequestHandler


def cmd_show(port=8080, no_browser=False):
    """Start web server and open browser to view analyses.

    Args:
        port: Port to serve on (default 8080)
        no_browser: If True, don't open browser automatically

    Returns:
        bool: True if successful, False on error
    """
    try:
        script_dir = Path(__file__).parent.parent
        frontend_dir = script_dir / 'frontend' / 'dist'

        if not frontend_dir.exists():
            print(f"Error: Frontend not built. Run 'cd frontend && npm run build' first.")
            return False

        analysis_dir = Path.home() / '.aina' / 'analysis'
        analysis_dir.mkdir(parents=True, exist_ok=True)

        handler = create_request_handler(frontend_dir, analysis_dir)

        with socketserver.TCPServer(('', port), handler) as httpd:
            url = f'http://localhost:{port}'
            print(f'Serving at {url}')
            print('Press Ctrl+C to stop')

            if not no_browser:
                webbrowser.open(url)

            httpd.serve_forever()

    except KeyboardInterrupt:
        print('\nStopped')
        return True
    except OSError as e:
        if 'Address already in use' in str(e):
            print(f"Error: Port {port} already in use. Try a different port with --port")
        else:
            print(f"Error: {e}")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False
