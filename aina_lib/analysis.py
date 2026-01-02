"""Core analysis functions."""
import subprocess
import json
from pathlib import Path
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed

from .discovery import discover_repos
from .git_staleness import get_repo_staleness_info, format_staleness_warning
from .git_stats import get_file_stats


def run_cloc(repo_path, on_progress=None):
    """Run cloc on a repository and return parsed JSON.

    Args:
        repo_path: Path to repository to analyze
        on_progress: Optional callback for progress messages

    Returns:
        dict: Parsed cloc JSON output

    Raises:
        FileNotFoundError: If cloc is not installed
        RuntimeError: If cloc produces no usable output
    """
    def log(msg):
        if on_progress:
            on_progress(msg)

    try:
        result = subprocess.run(
            ['cloc', '--vcs=git', '--json', '--by-file', str(repo_path)],
            capture_output=True,
            text=True,
            check=False  # Don't fail on non-zero exit (e.g., timeout on one file)
        )

        # Parse JSON even if cloc had partial errors
        if not result.stdout.strip():
            raise RuntimeError(f"cloc produced no output: {result.stderr}")

        cloc_data = json.loads(result.stdout)

        # Check stderr for timeout errors and fall back to wc -l
        if result.stderr and 'exceeded timeout' in result.stderr:
            for line in result.stderr.splitlines():
                if 'exceeded timeout:' in line:
                    # Extract file path from error message
                    file_path = line.split('exceeded timeout:')[-1].strip()
                    if file_path and Path(file_path).exists():
                        try:
                            wc_result = subprocess.run(
                                ['wc', '-l', file_path],
                                capture_output=True,
                                text=True,
                                check=True
                            )
                            line_count = int(wc_result.stdout.strip().split()[0])
                            # Determine language from extension
                            ext = Path(file_path).suffix.lstrip('.')
                            lang_map = {
                                'ts': 'TypeScript', 'tsx': 'TypeScript',
                                'js': 'JavaScript', 'jsx': 'JavaScript',
                                'py': 'Python', 'java': 'Java',
                                'go': 'Go', 'rs': 'Rust', 'rb': 'Ruby',
                            }
                            language = lang_map.get(ext, 'Unknown')
                            # Add to cloc data
                            cloc_data[file_path] = {
                                'blank': 0,
                                'comment': 0,
                                'code': line_count,
                                'language': language
                            }
                            log(f"  (wc -l fallback for {Path(file_path).name}: {line_count} lines)")
                        except Exception:
                            pass  # Skip files we can't count

        return cloc_data

    except FileNotFoundError:
        raise FileNotFoundError("cloc not found. Install with: brew install cloc")
    except json.JSONDecodeError as e:
        raise RuntimeError(f"cloc produced invalid JSON: {e}")


def build_directory_tree(files, base_path):
    """Build hierarchical directory tree from flat file list.

    Args:
        files: Dict of {filepath: {blank, comment, code, language}}
        base_path: Base path to make all paths relative to

    Returns:
        dict: Tree structure with nested directories and files
    """
    base = Path(base_path)
    tree = {'_dirs': {}, '_files': []}

    for filepath, stats in files.items():
        path = Path(filepath)

        try:
            rel_path = path.relative_to(base)
        except ValueError:
            continue

        parts = rel_path.parts
        filename = parts[-1]
        current = tree

        for part in parts[:-1]:
            if part not in current['_dirs']:
                current['_dirs'][part] = {'_dirs': {}, '_files': []}
            current = current['_dirs'][part]

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
    node_path = f"{path_prefix}/{name}" if path_prefix else name

    has_dirs = '_dirs' in tree and tree['_dirs']
    has_files = '_files' in tree and tree['_files']

    if not has_dirs and not has_files:
        return None

    children = []

    if has_dirs:
        for dirname, subtree in sorted(tree['_dirs'].items()):
            child = tree_to_schema(subtree, dirname, node_path, git_stats)
            if child:
                children.append(child)

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
            if git_stats is not None:
                stats = git_stats.get(file['path'])
                if stats:
                    file_node['commits'] = {
                        'last_3_months': stats['commits_3m'],
                        'last_year': stats['commits_1y'],
                        'last_commit_date': stats['last_commit_date']
                    }
                    if 'contributors' in stats:
                        file_node['contributors'] = stats['contributors']
                else:
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


def check_staleness(repos):
    """Check staleness for all repositories in parallel.

    Args:
        repos: List of repository paths

    Returns:
        list: Staleness info dicts sorted by repo name
    """
    staleness_infos = []
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(get_repo_staleness_info, repo_path): repo_path for repo_path in repos}
        for future in as_completed(futures):
            staleness_infos.append(future.result())
    staleness_infos.sort(key=lambda x: x['repo'])
    return staleness_infos


def analyze_single_repo(repo_path, path_obj, on_progress=None):
    """Analyze a single repository.

    Args:
        repo_path: Path to repository
        path_obj: Path object for analysis set root
        on_progress: Optional callback for progress messages

    Returns:
        tuple: (repo_node, files_dict) or (None, None) on error
    """
    repo_name = Path(repo_path).name

    try:
        cloc_data = run_cloc(repo_path, on_progress=on_progress)
        files = {k: v for k, v in cloc_data.items() if k not in ['header', 'SUM']}

        if not files:
            return None, None

        repo_tree = build_directory_tree(files, repo_path)
        git_stats = get_file_stats(repo_path)

        is_root_repo = Path(repo_path).resolve() == path_obj.resolve()
        path_prefix = '' if is_root_repo else repo_name

        children = []

        for dirname, subtree in sorted(repo_tree['_dirs'].items()):
            child = tree_to_schema(subtree, dirname, path_prefix, git_stats)
            if child:
                children.append(child)

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
            stats = git_stats.get(file['path'])
            if stats:
                file_node['commits'] = {
                    'last_3_months': stats['commits_3m'],
                    'last_year': stats['commits_1y'],
                    'last_commit_date': stats['last_commit_date']
                }
                if 'contributors' in stats:
                    file_node['contributors'] = stats['contributors']
            else:
                file_node['commits'] = {
                    'last_3_months': 0,
                    'last_year': 0,
                    'last_commit_date': None
                }
            children.append(file_node)

        repo_node = {
            'name': repo_name,
            'type': 'repository',
            'path': path_prefix if path_prefix else repo_name,
            'children': children
        }

        return repo_node if children else None, files

    except Exception:
        return None, None


def analyze_repos(analysis_set_name, analysis_set_path, on_staleness_warning=None, on_progress=None):
    """Analyze all repositories in an analysis set.

    Args:
        analysis_set_name: Name of the analysis set
        analysis_set_path: Path to folder containing repositories
        on_staleness_warning: Optional callback(staleness_infos, behind_count) for user interaction.
                              If None, prints warning and prompts for input.
                              If provided, called with staleness info; should raise to abort.
        on_progress: Optional callback(message) for progress updates.
                     If None, prints to stdout.

    Returns:
        dict: Analysis results in JSON schema format

    Raises:
        ValueError: If path doesn't exist or no repos found
        FileNotFoundError: If cloc is not installed
    """
    def log(msg):
        if on_progress:
            on_progress(msg)
        else:
            print(msg)

    path_obj = Path(analysis_set_path)

    if not path_obj.exists():
        raise ValueError(f"Path does not exist: {analysis_set_path}")

    repos = discover_repos(analysis_set_path)

    if not repos:
        raise ValueError(f"No Git repositories found in: {analysis_set_path}")

    log(f"Found {len(repos)} repositories")

    # Check repository staleness
    log("\nChecking repository status...")
    staleness_infos = check_staleness(repos)

    warning = format_staleness_warning(staleness_infos)
    if warning:
        log("\nRepository status:")
        log(warning)
        log("")

    behind_count = sum(1 for info in staleness_infos if info['remote_status'] == 'behind')
    if behind_count > 0:
        if on_staleness_warning:
            on_staleness_warning(staleness_infos, behind_count)

    # Aggregate statistics
    total_files = 0
    total_lines = 0
    languages = {}
    repo_nodes = []

    for i, repo_path in enumerate(repos, 1):
        repo_name = Path(repo_path).name
        log(f"[{i}/{len(repos)}] Analyzing {repo_name}...")

        repo_node, files = analyze_single_repo(repo_path, path_obj, on_progress=log)

        if repo_node and files:
            repo_nodes.append(repo_node)

            for file in files.values():
                total_files += 1
                code_lines = file.get('code', 0)
                total_lines += code_lines
                lang = file.get('language', 'Unknown')
                languages[lang] = languages.get(lang, 0) + code_lines

            log(f"  {len(files)} files, {sum(f.get('code', 0) for f in files.values()):,} lines")
        elif files is None:
            log(f"  No files found in {repo_name}, skipping")

    if not repo_nodes:
        raise ValueError("No repositories were successfully analyzed")

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
            return True

        analyses = []
        for json_file in analysis_dir.glob('*.json'):
            if json_file.name == 'index.json':
                continue

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

        analyses.sort(key=lambda x: x['name'])

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
