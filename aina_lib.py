"""Aina library - Core functionality for analysis set management."""
import sqlite3
import subprocess
import json
import http.server
import socketserver
import urllib.parse
import webbrowser
from pathlib import Path
from datetime import datetime, timezone
from collections import defaultdict

class Database:

    def __init__(self, db_path):
        """Initialize database with analysis_sets table.

        Args:
            db_path: Path to SQLite database file
        """
        self.db_path = db_path
        # Ensure parent directory exists
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    def _connect(self):
        """Create a new database connection.

        Returns:
            sqlite3.Connection: Database connection
        """
        return sqlite3.connect(self.db_path)

    def _init_schema(self):
        """Initialize database schema."""
        with self._connect() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS analysis_sets (
                    id INTEGER PRIMARY KEY,
                    name TEXT UNIQUE NOT NULL,
                    path TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()

    def list_analysis_sets(self):
        """List all analysis sets from the database.

        Returns:
            List of dicts with 'name' and 'path' keys
        """
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT name, path FROM analysis_sets ORDER BY name")
            rows = cursor.fetchall()
            return [{'name': row[0], 'path': row[1]} for row in rows]

    def add_analysis_set(self, name, path):
        """Add a new analysis set to the database.

        Args:
            name: Name for the analysis set (must be unique)
            path: Path to folder containing repositories

        Raises:
            sqlite3.IntegrityError: If name already exists
        """
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO analysis_sets (name, path) VALUES (?, ?)",
                (name, path)
            )
            conn.commit()

    def remove_analysis_set(self, name):
        """Remove an analysis set from the database.

        Args:
            name: Name of the analysis set to remove

        Returns:
            bool: True if set was removed, False if not found
        """
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM analysis_sets WHERE name = ?", (name,))
            conn.commit()
            return cursor.rowcount > 0

    def get_analysis_set(self, name):
        """Get an analysis set by name.

        Args:
            name: Name of the analysis set

        Returns:
            dict with 'name' and 'path' keys, or None if not found
        """
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT name, path FROM analysis_sets WHERE name = ?", (name,))
            row = cursor.fetchone()
            return {'name': row[0], 'path': row[1]} if row else None


def discover_repos(path):
    """Discover Git repositories in a directory.

    Scans the given path and immediate subdirectories for .git directories.
    Stops at depth 2 (root + 1 level) to avoid scanning inside repositories.

    Args:
        path: Path to directory to scan

    Returns:
        List of repository paths (parent directories of .git)

    Raises:
        ValueError: If path does not exist
    """
    path_obj = Path(path)

    if not path_obj.exists():
        raise ValueError(f"Path does not exist: {path}")

    repos = []
    max_depth = 1  # Root (0) + 1 level

    for root, dirs, files in path_obj.walk():
        # Calculate current depth relative to starting path
        depth = len(Path(root).relative_to(path_obj).parts)

        if '.git' in dirs:
            repos.append(str(root))

        # Stop descending if we've reached max depth
        if depth >= max_depth:
            dirs.clear()

    return sorted(repos)


# Git statistics functions

def get_file_stats(repo_path):
    """Get commit statistics for all files in a repository.

    Args:
        repo_path: Path to git repository

    Returns:
        dict mapping file paths to stats:
        {
            'path/to/file.py': {
                'commits_3m': 5,
                'commits_1y': 23,
                'last_commit_date': '2025-11-15T14:32:00+01:00'
            }
        }

    Handles renames: if a file was renamed within the 1-year period,
    uses --follow to get accurate commit counts including pre-rename history.
    """
    # Step 1: Bulk query with rename detection
    result = subprocess.run(
        ['git', 'log', '-M', '--name-status', '--format=COMMIT|%aI', '--since=1 year ago'],
        cwd=repo_path,
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        return {}

    now = datetime.now(timezone.utc)
    three_months_ago = now.timestamp() - (90 * 24 * 60 * 60)

    stats = defaultdict(lambda: {
        'commits_3m': 0,
        'commits_1y': 0,
        'last_commit_date': None
    })

    renamed_files = set()  # Track files that were renamed
    current_date = None
    current_timestamp = None

    for line in result.stdout.split('\n'):
        line = line.strip()
        if not line:
            continue

        if line.startswith('COMMIT|'):
            current_date = line.split('|', 1)[1]
            try:
                dt = datetime.fromisoformat(current_date.replace('Z', '+00:00'))
                current_timestamp = dt.timestamp()
            except ValueError:
                current_timestamp = 0
            continue

        # Parse status line: M/A/D/Rxxx followed by path(s)
        parts = line.split('\t')
        if len(parts) < 2:
            continue

        status = parts[0]

        if status.startswith('R'):
            # Rename: R096\told_path\tnew_path
            if len(parts) == 3:
                old_path, new_path = parts[1], parts[2]
                renamed_files.add(new_path)
                # Count for new path (current name)
                file_path = new_path
            else:
                continue
        elif status in ('M', 'A', 'D'):
            file_path = parts[1]
        else:
            # Unknown status, skip
            continue

        stats[file_path]['commits_1y'] += 1

        if current_timestamp and current_timestamp >= three_months_ago:
            stats[file_path]['commits_3m'] += 1

        if stats[file_path]['last_commit_date'] is None:
            stats[file_path]['last_commit_date'] = current_date

    # Step 2: For renamed files, use --follow to get accurate history
    for file_path in renamed_files:
        follow_stats = get_file_stats_with_follow(repo_path, file_path, three_months_ago)
        if follow_stats:
            stats[file_path] = follow_stats

    return dict(stats)


def get_file_stats_with_follow(repo_path, file_path, three_months_timestamp):
    """Get accurate commit stats for a single file using --follow.

    Used for renamed files to include pre-rename commit history.

    Args:
        repo_path: Path to git repository
        file_path: Path to file within repository
        three_months_timestamp: Unix timestamp for 3-month cutoff

    Returns:
        dict with commits_3m, commits_1y, last_commit_date, or None on error
    """
    result = subprocess.run(
        ['git', 'log', '--follow', '--format=%aI', '--since=1 year ago', '--', file_path],
        cwd=repo_path,
        capture_output=True,
        text=True
    )

    if result.returncode != 0 or not result.stdout.strip():
        return None

    commits_3m = 0
    commits_1y = 0
    last_commit_date = None

    for line in result.stdout.strip().split('\n'):
        if not line:
            continue

        commits_1y += 1

        if last_commit_date is None:
            last_commit_date = line

        try:
            dt = datetime.fromisoformat(line.replace('Z', '+00:00'))
            if dt.timestamp() >= three_months_timestamp:
                commits_3m += 1
        except ValueError:
            pass

    return {
        'commits_3m': commits_3m,
        'commits_1y': commits_1y,
        'last_commit_date': last_commit_date
    }


# CLI Command wrappers

def cmd_add(name, path, db_path):
    """CLI command: Add a new analysis set.

    Args:
        name: Name for the analysis set
        path: Path to folder containing repositories
        db_path: Path to SQLite database

    Returns:
        bool: True if successful, False on error
    """
    # Validate path exists
    if not Path(path).exists():
        print(f"Error: Path does not exist: {path}")
        return False

    try:
        database = Database(db_path)
        database.add_analysis_set(name, path)
        print(f"Added analysis set '{name}' -> {path}")
        return True
    except sqlite3.IntegrityError:
        print(f"Error: Analysis set '{name}' already exists")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False


def cmd_list(db_path):
    """CLI command: List all analysis sets.

    Args:
        db_path: Path to SQLite database

    Returns:
        bool: True if successful, False on error
    """
    try:
        database = Database(db_path)
        sets = database.list_analysis_sets()

        if not sets:
            print("No analysis sets registered.")
        else:
            print(f"{'Name':<20} Path")
            print("-" * 60)
            for s in sets:
                print(f"{s['name']:<20} {s['path']}")

        return True
    except Exception as e:
        print(f"Error: {e}")
        return False


def cmd_remove(name, db_path):
    """CLI command: Remove an analysis set.

    Args:
        name: Name of the analysis set to remove
        db_path: Path to SQLite database

    Returns:
        bool: True if successful, False on error
    """
    try:
        database = Database(db_path)
        success = database.remove_analysis_set(name)

        if success:
            print(f"Removed analysis set '{name}'")
            return True
        else:
            print(f"Error: Analysis set '{name}' not found")
            return False
    except Exception as e:
        print(f"Error: {e}")
        return False


# Analysis functions

def run_cloc(repo_path):
    """Run cloc on a repository and return parsed JSON.

    Args:
        repo_path: Path to repository to analyze

    Returns:
        dict: Parsed cloc JSON output, or None on error

    Raises:
        FileNotFoundError: If cloc is not installed
        subprocess.CalledProcessError: If cloc fails
    """
    try:
        result = subprocess.run(
            ['cloc', '--vcs=git', '--json', '--by-file', str(repo_path)],
            capture_output=True,
            text=True,
            check=True
        )
        return json.loads(result.stdout)
    except FileNotFoundError:
        raise FileNotFoundError("cloc not found. Install with: brew install cloc")
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"cloc failed: {e.stderr}")


def build_directory_tree(files, base_path):
    """Build hierarchical directory tree from flat file list.

    Args:
        files: Dict of {filepath: {blank, comment, code, language}}
        base_path: Base path to make all paths relative to

    Returns:
        dict: Tree structure with nested directories and files
    """
    base = Path(base_path)

    # Build tree structure - root has _dirs and _files
    tree = {'_dirs': {}, '_files': []}

    for filepath, stats in files.items():
        path = Path(filepath)

        try:
            rel_path = path.relative_to(base)
        except ValueError:
            # File outside base path, skip
            continue

        # Navigate/create tree structure
        parts = rel_path.parts
        filename = parts[-1]

        # Start at root, which has _dirs for subdirectories
        current = tree

        # Navigate through directory parts (all but filename)
        for part in parts[:-1]:
            # Navigate into _dirs to find or create the directory
            if part not in current['_dirs']:
                current['_dirs'][part] = {'_dirs': {}, '_files': []}
            current = current['_dirs'][part]

        # Now current is the directory node that should contain this file
        # Add the file to this directory's _files list
        current['_files'].append({
            'name': filename,
            'path': str(rel_path),
            'value': stats.get('code', 0),
            'language': stats.get('language', 'Unknown'),
            'extension': path.suffix,
            'blank': stats.get('blank', 0),
            'comment': stats.get('comment', 0)
        })

    return tree


def tree_to_schema(tree, name, path_prefix='', git_stats=None):
    """Convert internal tree structure to JSON schema format.

    Args:
        tree: Internal tree structure from build_directory_tree
        name: Name of this node
        path_prefix: Path prefix for this node
        git_stats: Optional dict of git statistics keyed by file path

    Returns:
        dict: Node in JSON schema format
    """
    # Determine if this is a directory or repository
    node_path = f"{path_prefix}/{name}" if path_prefix else name

    # Check if we have any children (dirs or files)
    has_dirs = '_dirs' in tree and tree['_dirs']
    has_files = '_files' in tree and tree['_files']

    if not has_dirs and not has_files:
        # Leaf directory with no content - skip
        return None

    children = []

    # Add subdirectories
    if has_dirs:
        for dirname, subtree in sorted(tree['_dirs'].items()):
            child = tree_to_schema(subtree, dirname, node_path, git_stats)
            if child:
                children.append(child)

    # Add files
    if has_files:
        for file in sorted(tree['_files'], key=lambda f: f['name']):
            file_path = f"{node_path}/{file['name']}"
            file_node = {
                'name': file['name'],
                'type': 'file',
                'path': file_path,
                'value': file['value'],
                'language': file['language'],
                'extension': file['extension']
            }
            # Add git stats - look up by relative path within repo
            if git_stats is not None:
                # file['path'] contains the path relative to repo root
                stats = git_stats.get(file['path'])
                if stats:
                    file_node['commits'] = {
                        'last_3_months': stats['commits_3m'],
                        'last_year': stats['commits_1y'],
                        'last_commit_date': stats['last_commit_date']
                    }
                else:
                    # No commits in the last year
                    file_node['commits'] = {
                        'last_3_months': 0,
                        'last_year': 0,
                        'last_commit_date': None
                    }
            children.append(file_node)

    node = {
        'name': name,
        'type': 'directory',
        'path': node_path,
        'children': children
    }

    return node


def analyze_repos(analysis_set_name, analysis_set_path):
    """Analyze all repositories in an analysis set.

    Args:
        analysis_set_name: Name of the analysis set
        analysis_set_path: Path to folder containing repositories

    Returns:
        dict: Analysis results in JSON schema format

    Raises:
        ValueError: If path doesn't exist or no repos found
        FileNotFoundError: If cloc is not installed
    """
    path_obj = Path(analysis_set_path)

    if not path_obj.exists():
        raise ValueError(f"Path does not exist: {analysis_set_path}")

    # Discover repositories
    repos = discover_repos(analysis_set_path)

    if not repos:
        raise ValueError(f"No Git repositories found in: {analysis_set_path}")

    print(f"Found {len(repos)} repositories")

    # Aggregate statistics
    total_files = 0
    total_lines = 0
    languages = {}

    # Build tree for each repository
    repo_nodes = []

    for i, repo_path in enumerate(repos, 1):
        repo_name = Path(repo_path).name
        print(f"[{i}/{len(repos)}] Analyzing {repo_name}...")

        try:
            # Run cloc
            cloc_data = run_cloc(repo_path)

            # Extract file data (skip header and SUM)
            files = {k: v for k, v in cloc_data.items()
                    if k not in ['header', 'SUM']}

            if not files:
                print(f"  No files found in {repo_name}, skipping")
                continue

            # Build tree for this repo
            repo_tree = build_directory_tree(files, repo_path)

            # Get git statistics for this repo
            git_stats = get_file_stats(repo_path)

            # Determine path prefix: empty if repo IS the analysis_set_path
            # (root_path already points to repo, no need to prefix repo_name)
            is_root_repo = Path(repo_path).resolve() == path_obj.resolve()
            path_prefix = '' if is_root_repo else repo_name

            # Convert to schema format - repo_tree has _dirs and _files at root
            children = []

            # Add subdirectories from _dirs
            for dirname, subtree in sorted(repo_tree['_dirs'].items()):
                child = tree_to_schema(subtree, dirname, path_prefix, git_stats)
                if child:
                    children.append(child)

            # Add root-level files from _files
            for file in sorted(repo_tree['_files'], key=lambda f: f['name']):
                file_path = f"{path_prefix}/{file['name']}" if path_prefix else file['name']
                file_node = {
                    'name': file['name'],
                    'type': 'file',
                    'path': file_path,
                    'value': file['value'],
                    'language': file['language'],
                    'extension': file['extension']
                }
                # Add git stats for root-level files
                stats = git_stats.get(file['path'])
                if stats:
                    file_node['commits'] = {
                        'last_3_months': stats['commits_3m'],
                        'last_year': stats['commits_1y'],
                        'last_commit_date': stats['last_commit_date']
                    }
                else:
                    # No commits in the last year
                    file_node['commits'] = {
                        'last_3_months': 0,
                        'last_year': 0,
                        'last_commit_date': None
                    }
                children.append(file_node)

            # Create repo node
            repo_node = {
                'name': repo_name,
                'type': 'repository',
                'path': path_prefix if path_prefix else repo_name,
                'children': children
            }

            if children:  # Only add if we have content
                repo_nodes.append(repo_node)

                # Update statistics
                for file in files.values():
                    total_files += 1
                    code_lines = file.get('code', 0)
                    total_lines += code_lines
                    lang = file.get('language', 'Unknown')
                    languages[lang] = languages.get(lang, 0) + code_lines

                print(f"  {len(files)} files, {sum(f.get('code', 0) for f in files.values()):,} lines")

        except Exception as e:
            print(f"  Error analyzing {repo_name}: {e}")
            continue

    if not repo_nodes:
        raise ValueError("No repositories were successfully analyzed")

    # Build final JSON structure
    analysis_json = {
        'analysis_set': analysis_set_name,
        'root_path': str(analysis_set_path),
        'generated_at': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
        'stats': {
            'total_files': total_files,
            'total_lines': total_lines,
            'total_repos': len(repo_nodes),
            'languages': dict(sorted(languages.items(), key=lambda x: x[1], reverse=True))
        },
        'tree': {
            'name': analysis_set_name,
            'type': 'analysis_set',
            'children': repo_nodes
        }
    }

    return analysis_json


def generate_analysis_index():
    """Generate index.json listing all available analyses.

    Returns:
        bool: True if successful, False on error
    """
    try:
        analysis_dir = Path.home() / '.aina' / 'analysis'

        if not analysis_dir.exists():
            return True  # No analyses yet, that's ok

        # Find all JSON files
        analyses = []
        for json_file in analysis_dir.glob('*.json'):
            if json_file.name == 'index.json':
                continue  # Skip the index itself

            try:
                with open(json_file) as f:
                    data = json.load(f)
                    analyses.append({
                        'name': data.get('analysis_set', json_file.stem),
                        'filename': json_file.name,
                        'generated_at': data.get('generated_at'),
                        'stats': data.get('stats', {})
                    })
            except Exception as e:
                print(f"Warning: Failed to read {json_file.name}: {e}")
                continue

        # Sort by name
        analyses.sort(key=lambda x: x['name'])

        # Write index
        index_path = analysis_dir / 'index.json'
        with open(index_path, 'w') as f:
            json.dump({
                'analyses': analyses,
                'updated_at': datetime.utcnow().isoformat() + 'Z'
            }, f, indent=2)

        return True

    except Exception as e:
        print(f"Error generating index: {e}")
        return False


def cmd_analyze(name, path, db_path):
    """CLI command: Analyze an analysis set and generate JSON.

    First time: path is required, registers the analysis set.
    Subsequent times: path is optional, uses stored path.
    If path provided differs from stored path, errors.

    Args:
        name: Name for the analysis set
        path: Path to folder (required first time, optional after)
        db_path: Path to SQLite database

    Returns:
        bool: True if successful, False on error
    """
    try:
        database = Database(db_path)
        analysis_set = database.get_analysis_set(name)

        if analysis_set:
            # Existing analysis set
            stored_path = analysis_set['path']
            if path and Path(path).resolve() != Path(stored_path).resolve():
                print(f"Error: Path mismatch for '{name}'")
                print(f"  Stored: {stored_path}")
                print(f"  Given:  {path}")
                print(f"Use 'aina remove {name}' first to change the path.")
                return False
            analysis_set_path = stored_path
        else:
            # New analysis set - path required
            if not path:
                print(f"Error: Analysis set '{name}' not found.")
                print(f"Provide a path to create it: aina analyze {name} /path/to/repos")
                return False
            # Validate path exists
            if not Path(path).exists():
                print(f"Error: Path does not exist: {path}")
                return False
            # Register new analysis set
            try:
                database.add_analysis_set(name, path)
                print(f"Registered '{name}' -> {path}")
            except sqlite3.IntegrityError:
                print(f"Error: Analysis set '{name}' already exists")
                return False
            analysis_set_path = path

        print(f"Analyzing '{name}' at {analysis_set_path}")

        # Run analysis
        analysis_json = analyze_repos(name, analysis_set_path)

        # Write output
        output_dir = Path.home() / '.aina' / 'analysis'
        output_dir.mkdir(parents=True, exist_ok=True)

        output_path = output_dir / f"{name}.json"

        with open(output_path, 'w') as f:
            json.dump(analysis_json, f, indent=2)

        # Update index
        generate_analysis_index()

        stats = analysis_json['stats']
        print(f"\nAnalysis complete!")
        print(f"  Repositories: {stats['total_repos']}")
        print(f"  Files: {stats['total_files']:,}")
        print(f"  Lines of code: {stats['total_lines']:,}")
        print(f"\nOutput: {output_path}")

        return True

    except FileNotFoundError as e:
        print(f"Error: {e}")
        return False
    except ValueError as e:
        print(f"Error: {e}")
        return False
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False


# Serve command
#
# NOTE: API endpoint logic is duplicated in frontend/vite.config.js (dev server)
# and here (production server). Changes to /api/analyses, /api/file, or
# /api/clocignore must be synced in both places.

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

            # API: /api/analyses/* - serve analysis JSON files
            if path.startswith('/api/analyses'):
                self.handle_analyses(path)
            # API: /api/file - serve file content from analysis root
            elif path == '/api/file':
                self.handle_file(query)
            # API: /api/clocignore - serve merged clocignore
            elif path == '/api/clocignore':
                self.handle_clocignore(query)
            else:
                # Serve static files from frontend/dist
                super().do_GET()

        def handle_analyses(self, path):
            """Serve analysis JSON files from ~/.aina/analysis/"""
            # Remove /api/analyses prefix
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

            # Resolve to absolute paths and validate containment
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

                # If root_path doesn't exist (e.g., Docker serve without repos mounted),
                # return empty content gracefully
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

                # Read root .clocignore
                add_patterns_from(root_path / '.clocignore')

                # Read .clocignore from each immediate subdirectory (repos)
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
    """CLI command: Start web server and open browser to view analyses.

    Args:
        port: Port to serve on (default 8080)
        no_browser: If True, don't open browser automatically

    Returns:
        bool: True if successful, False on error
    """
    try:
        # Find frontend/dist directory relative to this script
        script_dir = Path(__file__).parent
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
