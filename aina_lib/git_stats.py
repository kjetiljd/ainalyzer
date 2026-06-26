"""Git file statistics functions."""
import subprocess
from datetime import datetime, timezone
from collections import defaultdict
from itertools import combinations


def get_file_stats(repo_path, coupling_threshold=3):
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
    result = subprocess.run(
        ['git', 'log', '-M', '--name-status', '--format=COMMIT|%aI|%aN', '--since=1 year ago'],
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
        'last_commit_date': None,
        'contributors_set': set()
    })

    renamed_files = set()
    current_date = None
    current_timestamp = None
    current_author = None

    for line in result.stdout.split('\n'):
        line = line.strip()
        if not line:
            continue

        if line.startswith('COMMIT|'):
            parts = line.split('|')
            current_date = parts[1] if len(parts) > 1 else None
            current_author = parts[2] if len(parts) > 2 else None
            try:
                dt = datetime.fromisoformat(current_date.replace('Z', '+00:00'))
                current_timestamp = dt.timestamp()
            except ValueError:
                current_timestamp = 0
            continue

        parts = line.split('\t')
        if len(parts) < 2:
            continue

        status = parts[0]

        if status.startswith('R'):
            if len(parts) == 3:
                old_path, new_path = parts[1], parts[2]
                renamed_files.add(new_path)
                file_path = new_path
            else:
                continue
        elif status in ('M', 'A', 'D'):
            file_path = parts[1]
        else:
            continue

        stats[file_path]['commits_1y'] += 1

        if current_timestamp and current_timestamp >= three_months_ago:
            stats[file_path]['commits_3m'] += 1

        if stats[file_path]['last_commit_date'] is None:
            stats[file_path]['last_commit_date'] = current_date

        if current_author:
            stats[file_path]['contributors_set'].add(current_author)

    # For renamed files, use --follow to get accurate history
    for file_path in renamed_files:
        follow_stats = get_file_stats_with_follow(repo_path, file_path, three_months_ago)
        if follow_stats:
            # Merge contributors from both passes (follow may have more from pre-rename)
            follow_stats['contributors_set'].update(stats[file_path]['contributors_set'])
            stats[file_path] = follow_stats

    # Convert contributors_set to final format
    result = {}
    for file_path, file_stats in stats.items():
        contributors_set = file_stats.pop('contributors_set', set())
        contributors_list = sorted(list(contributors_set))
        file_stats['contributors'] = {
            'count': len(contributors_list),
            'names': contributors_list
        }
        result[file_path] = file_stats

    return result


def get_file_stats_with_follow(repo_path, file_path, three_months_timestamp):
    """Get accurate commit stats for a single file using --follow.

    Used for renamed files to include pre-rename commit history.

    Args:
        repo_path: Path to git repository
        file_path: Path to file within repository
        three_months_timestamp: Unix timestamp for 3-month cutoff

    Returns:
        dict with commits_3m, commits_1y, last_commit_date, contributors_set, or None on error
    """
    result = subprocess.run(
        ['git', 'log', '--follow', '--format=%aI|%aN', '--since=1 year ago', '--', file_path],
        cwd=repo_path,
        capture_output=True,
        text=True
    )

    if result.returncode != 0 or not result.stdout.strip():
        return None

    commits_3m = 0
    commits_1y = 0
    last_commit_date = None
    contributors_set = set()

    for line in result.stdout.strip().split('\n'):
        if not line:
            continue

        parts = line.split('|')
        date_str = parts[0]
        author = parts[1] if len(parts) > 1 else None

        commits_1y += 1

        if last_commit_date is None:
            last_commit_date = date_str

        if author:
            contributors_set.add(author)

        try:
            dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            if dt.timestamp() >= three_months_timestamp:
                commits_3m += 1
        except ValueError:
            pass

    return {
        'commits_3m': commits_3m,
        'commits_1y': commits_1y,
        'last_commit_date': last_commit_date,
        'contributors_set': contributors_set
    }


def _resolve_rename_path(path):
    """Resolve git numstat rename path syntax to the surviving (new) path.

    Numstat renders renames in two forms:
      - ``old/path => new/path`` (whole path changed)
      - ``src/{old => new}/file.js`` (brace substitution of a path segment)
    Either form (incl. empty old/new segments) resolves to the new path.
    """
    if '=>' not in path:
        return path

    if '{' in path and '}' in path:
        pre, rest = path.split('{', 1)
        inside, post = rest.split('}', 1)
        new_segment = inside.split('=>')[1].strip()
        combined = pre + new_segment + post
        # An empty old/new segment can leave a doubled slash; collapse it.
        return combined.replace('//', '/')

    return path.split('=>')[1].strip()


def get_growth_data(repo_path, valid_paths=None):
    """Per-file net growth and repo deletion-inclusive totals from one git pass.

    Runs a single ``git log -M --numstat --no-merges`` pass and derives both:

      - **Per-file signed net** ``(added - deleted)`` for the 3-month and 1-year
        windows, with renames resolved to the surviving path and reconciled against
        ``valid_paths`` (the cloc file set) when provided, so growth can only light up
        cells that have a cloc area.
      - **Repo-level totals** ``{added, deleted, net}`` per window, summed over *all*
        commits (NOT filtered to surviving files), so whole-file deletions are included.
        This is the deletion-inclusive truth the honest headline reports.

    Args:
        repo_path: Path to git repository
        valid_paths: Optional iterable of paths to keep in the per-file result
            (typically the cloc ``files`` keys). When ``None``, all paths are kept.

    Returns:
        dict: ``{'files': {rel_path: {...}}, 'totals': {window: {added, deleted, net}}}``
        where each per-file entry is::

            {
                'last_3_months': net, 'last_year': net,
                'added_3m': a, 'deleted_3m': d,
                'added_1y': a, 'deleted_1y': d,
            }
    """
    def empty_totals():
        return {
            'last_3_months': {'added': 0, 'deleted': 0, 'net': 0},
            'last_year': {'added': 0, 'deleted': 0, 'net': 0},
        }

    result = subprocess.run(
        ['git', 'log', '-M', '--numstat', '--no-merges', '--format=COMMIT|%aI', '--since=1 year ago'],
        cwd=repo_path,
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        return {'files': {}, 'totals': empty_totals()}

    now = datetime.now(timezone.utc)
    three_months_ago = now.timestamp() - (90 * 24 * 60 * 60)

    valid_set = set(valid_paths) if valid_paths is not None else None

    file_stats = defaultdict(lambda: {
        'added_3m': 0, 'deleted_3m': 0, 'added_1y': 0, 'deleted_1y': 0
    })
    totals = {
        'last_3_months': {'added': 0, 'deleted': 0},
        'last_year': {'added': 0, 'deleted': 0},
    }

    current_timestamp = None

    for line in result.stdout.split('\n'):
        if not line.strip():
            continue

        if line.startswith('COMMIT|'):
            parts = line.split('|', 1)
            date_str = parts[1] if len(parts) > 1 else ''
            try:
                dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                current_timestamp = dt.timestamp()
            except ValueError:
                current_timestamp = 0
            continue

        parts = line.split('\t')
        if len(parts) < 3:
            continue

        added_str, deleted_str, raw_path = parts[0], parts[1], parts[2]
        if added_str == '-' or deleted_str == '-':
            continue  # binary file: numstat reports '-' for both columns

        try:
            added = int(added_str)
            deleted = int(deleted_str)
        except ValueError:
            continue

        in_3m = current_timestamp is not None and current_timestamp >= three_months_ago

        # Repo totals: deletion-inclusive, not filtered to surviving files.
        totals['last_year']['added'] += added
        totals['last_year']['deleted'] += deleted
        if in_3m:
            totals['last_3_months']['added'] += added
            totals['last_3_months']['deleted'] += deleted

        # Per-file growth, keyed by the surviving path.
        path = _resolve_rename_path(raw_path)
        stats = file_stats[path]
        stats['added_1y'] += added
        stats['deleted_1y'] += deleted
        if in_3m:
            stats['added_3m'] += added
            stats['deleted_3m'] += deleted

    files_out = {}
    for path, stats in file_stats.items():
        if valid_set is not None and path not in valid_set:
            continue
        files_out[path] = {
            'last_3_months': stats['added_3m'] - stats['deleted_3m'],
            'last_year': stats['added_1y'] - stats['deleted_1y'],
            'added_3m': stats['added_3m'],
            'deleted_3m': stats['deleted_3m'],
            'added_1y': stats['added_1y'],
            'deleted_1y': stats['deleted_1y'],
        }

    for window in totals:
        totals[window]['net'] = totals[window]['added'] - totals[window]['deleted']

    return {'files': files_out, 'totals': totals}


def get_file_growth(repo_path, valid_paths=None):
    """Per-file net growth (convenience wrapper around :func:`get_growth_data`)."""
    return get_growth_data(repo_path, valid_paths)['files']


def get_repo_growth_totals(repo_path):
    """Repo deletion-inclusive totals (wrapper around :func:`get_growth_data`)."""
    return get_growth_data(repo_path)['totals']


def get_coupling_data(repo_path, threshold=3, max_pairs=500):
    """Detect files that frequently change together.

    Args:
        repo_path: Path to git repository
        threshold: Minimum co-changes to include (default: 3)
        max_pairs: Maximum number of pairs to return (default: 500)

    Returns:
        dict with coupling data:
        {
            'threshold': 3,
            'pairs': [
                {'files': ['path/a.py', 'path/b.py'], 'count': 15},
                ...
            ]
        }

    Pairs are sorted by count (descending) and limited to max_pairs.
    """
    result = subprocess.run(
        ['git', 'log', '-M', '--name-status', '--format=COMMIT|%H', '--since=1 year ago'],
        cwd=repo_path,
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        return {'threshold': threshold, 'pairs': []}

    # Collect files per commit
    commits = []  # List of sets of files
    current_files = set()

    for line in result.stdout.split('\n'):
        line = line.strip()
        if not line:
            continue

        if line.startswith('COMMIT|'):
            # Save previous commit's files if any
            if current_files:
                commits.append(current_files)
            current_files = set()
            continue

        parts = line.split('\t')
        if len(parts) < 2:
            continue

        status = parts[0]

        if status.startswith('R'):
            if len(parts) == 3:
                # For renames, track the new path
                current_files.add(parts[2])
        elif status in ('M', 'A', 'D'):
            current_files.add(parts[1])

    # Don't forget the last commit
    if current_files:
        commits.append(current_files)

    # Build co-change counts
    co_changes = defaultdict(int)

    for files in commits:
        # Skip commits with too many files (likely merges or bulk changes)
        if len(files) > 50:
            continue

        # Create all pairs from this commit
        for file_a, file_b in combinations(sorted(files), 2):
            co_changes[(file_a, file_b)] += 1

    # Filter by threshold and sort by count
    pairs = [
        {'files': list(pair), 'count': count}
        for pair, count in co_changes.items()
        if count >= threshold
    ]
    pairs.sort(key=lambda p: p['count'], reverse=True)

    # Limit to max_pairs
    pairs = pairs[:max_pairs]

    return {
        'threshold': threshold,
        'pairs': pairs
    }
