"""Aina library - Core functionality for analysis set management."""
import sqlite3
import subprocess
import json
from pathlib import Path
from datetime import datetime

class Database:

    def __init__(self, db_path):
        """Initialize database with analysis_sets table.

        Args:
            db_path: Path to SQLite database file

        Returns:
            sqlite3.Connection: Database connection
        """
        # Ensure parent directory exists
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)

        self.conn = sqlite3.connect(db_path)
        cursor = self.conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS analysis_sets (
                id INTEGER PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                path TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        self.conn.commit()

    def list_analysis_sets(self):
        """List all analysis sets from the database.

        Args:
            conn: sqlite3.Connection

        Returns:
            List of dicts with 'name' and 'path' keys
        """
        cursor = self.conn.cursor()
        cursor.execute("SELECT name, path FROM analysis_sets ORDER BY name")
        rows = cursor.fetchall()

        return [{'name': row[0], 'path': row[1]} for row in rows]

    def add_analysis_set(self, name, path):
        """Add a new analysis set to the database.

        Args:
            conn: sqlite3.Connection
            name: Name for the analysis set (must be unique)
            path: Path to folder containing repositories

        Raises:
            sqlite3.IntegrityError: If name already exists
        """
        cursor = self.conn.cursor()
        cursor.execute(
            "INSERT INTO analysis_sets (name, path) VALUES (?, ?)",
            (name, path)
        )
        self.conn.commit()


    def remove_analysis_set(self, name):
        """Remove an analysis set from the database.

        Args:
            conn: sqlite3.Connection
            name: Name of the analysis set to remove

        Returns:
            bool: True if set was removed, False if not found
        """
        cursor = self.conn.cursor()
        cursor.execute("DELETE FROM analysis_sets WHERE name = ?", (name,))
        self.conn.commit()

        return cursor.rowcount > 0


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


def tree_to_schema(tree, name, path_prefix=''):
    """Convert internal tree structure to JSON schema format.

    Args:
        tree: Internal tree structure from build_directory_tree
        name: Name of this node
        path_prefix: Path prefix for this node

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
            child = tree_to_schema(subtree, dirname, node_path)
            if child:
                children.append(child)

    # Add files
    if has_files:
        for file in sorted(tree['_files'], key=lambda f: f['name']):
            file_node = {
                'name': file['name'],
                'type': 'file',
                'path': file['path'],
                'value': file['value'],
                'language': file['language'],
                'extension': file['extension']
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

            # Convert to schema format - repo_tree has _dirs and _files at root
            children = []

            # Add subdirectories from _dirs
            for dirname, subtree in sorted(repo_tree['_dirs'].items()):
                child = tree_to_schema(subtree, dirname, repo_name)
                if child:
                    children.append(child)

            # Add root-level files from _files
            for file in sorted(repo_tree['_files'], key=lambda f: f['name']):
                file_node = {
                    'name': file['name'],
                    'type': 'file',
                    'path': file['path'],
                    'value': file['value'],
                    'language': file['language'],
                    'extension': file['extension']
                }
                children.append(file_node)

            # Create repo node
            repo_node = {
                'name': repo_name,
                'type': 'repository',
                'path': repo_name,
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
        'generated_at': datetime.utcnow().isoformat() + 'Z',
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


def cmd_analyze(name, db_path):
    """CLI command: Analyze an analysis set and generate JSON.

    Args:
        name: Name of the analysis set to analyze
        db_path: Path to SQLite database

    Returns:
        bool: True if successful, False on error
    """
    try:
        # Get analysis set from database
        conn = init_database(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT path FROM analysis_sets WHERE name = ?", (name,))
        row = cursor.fetchone()
        conn.close()

        if not row:
            print(f"Error: Analysis set '{name}' not found")
            return False

        analysis_set_path = row[0]

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
