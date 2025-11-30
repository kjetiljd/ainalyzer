#!/usr/bin/env python3
"""
Git File Statistics - Final Implementation

Gets per-file commit counts for 3-month and 1-year periods.
Uses bulk git log for performance, with --follow for renamed files.

Usage:
    from git_file_stats import get_file_stats
    stats = get_file_stats('/path/to/repo')
"""

import subprocess
from collections import defaultdict
from datetime import datetime, timezone


def get_file_stats(repo_path: str) -> dict:
    """
    Get commit statistics for all files in a repository.

    Returns dict mapping file paths to stats:
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
        text=True,
        check=True
    )

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
        follow_stats = _get_file_stats_with_follow(repo_path, file_path, three_months_ago)
        if follow_stats:
            stats[file_path] = follow_stats

    return dict(stats)


def _get_file_stats_with_follow(repo_path: str, file_path: str, three_months_timestamp: float) -> dict | None:
    """
    Get accurate commit stats for a single file using --follow.

    Used for renamed files to include pre-rename commit history.
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


def get_file_stats_multi_repo(root_path: str, repos: list[str]) -> dict:
    """
    Get file stats across multiple repositories.

    Args:
        root_path: Root path for relative path calculation
        repos: List of repository paths

    Returns dict with repo-prefixed paths.
    """
    from pathlib import Path

    combined_stats = {}
    root = Path(root_path)

    for repo_path in repos:
        repo = Path(repo_path)
        repo_name = repo.relative_to(root) if repo != root else Path('.')

        stats = get_file_stats(repo_path)

        for file_path, file_stats in stats.items():
            full_path = str(repo_name / file_path) if repo_name != Path('.') else file_path
            combined_stats[full_path] = file_stats

    return combined_stats


if __name__ == '__main__':
    import sys
    import time
    import json

    repo_path = sys.argv[1] if len(sys.argv) > 1 else '.'

    print(f"Analyzing: {repo_path}")
    print()

    start = time.time()
    stats = get_file_stats(repo_path)
    elapsed = time.time() - start

    print(f"Files with commits: {len(stats)}")
    print(f"Time: {elapsed:.3f}s")
    print()

    # Count renames
    # (We can't easily count from stats, but we can re-check)
    result = subprocess.run(
        ['git', 'log', '-M', '--name-status', '--format=', '--since=1 year ago'],
        cwd=repo_path,
        capture_output=True,
        text=True
    )
    rename_count = sum(1 for line in result.stdout.split('\n') if line.startswith('R'))
    print(f"Renames detected (1 year): {rename_count}")
    print()

    # Sample output
    print("Sample (first 5 files):")
    for i, (path, s) in enumerate(list(stats.items())[:5]):
        print(f"  {path}")
        print(f"    3m: {s['commits_3m']}, 1y: {s['commits_1y']}, last: {s['last_commit_date']}")

    # Optionally output JSON
    if '--json' in sys.argv:
        print()
        print(json.dumps(stats, indent=2))
