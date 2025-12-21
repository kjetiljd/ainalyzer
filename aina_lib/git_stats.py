"""Git file statistics functions."""
import subprocess
from datetime import datetime, timezone
from collections import defaultdict


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
