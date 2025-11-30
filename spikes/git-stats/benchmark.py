#!/usr/bin/env python3
"""
Spike: Git Per-File Statistics

Benchmarks different approaches for getting commit counts per file:
1. Per-file git rev-list (N subprocess calls)
2. Bulk git log with parsing (1 subprocess call)
3. git log --numstat for additional metrics

Tests run against a real repository to measure performance.
"""

import subprocess
import time
import os
from pathlib import Path
from collections import defaultdict
from datetime import datetime, timezone


# Test repository - adjust as needed
# TEST_REPO = "/Users/t988833/Projects/kjetiljd/meta-repo-workshop/todo-meta"
TEST_REPO = "/Users/t988833/Projects/TelenorNorgeInternal/s00386-cos"


def get_all_files(repo_path: str, limit: int = None) -> list[str]:
    """Get list of tracked files in repository."""
    result = subprocess.run(
        ['git', 'ls-files'],
        cwd=repo_path,
        capture_output=True,
        text=True,
        check=True
    )
    files = [f for f in result.stdout.strip().split('\n') if f]
    if limit:
        files = files[:limit]
    return files


# =============================================================================
# APPROACH 1: Per-file git rev-list
# =============================================================================

def approach1_per_file(repo_path: str, files: list[str], since: str = "3 months ago") -> dict:
    """
    Get commit count per file using individual git rev-list calls.

    This is the most straightforward approach but requires N subprocess calls.
    """
    results = {}
    for file_path in files:
        result = subprocess.run(
            ['git', 'rev-list', 'HEAD', '--count', f'--since={since}', '--', file_path],
            cwd=repo_path,
            capture_output=True,
            text=True
        )
        count = int(result.stdout.strip()) if result.stdout.strip() else 0
        results[file_path] = count
    return results


# =============================================================================
# APPROACH 2: Bulk git log with --name-only
# =============================================================================

def approach2_bulk_name_only(repo_path: str, since: str = "3 months ago") -> dict:
    """
    Get commit count per file using single git log call with --name-only.

    Parses output and counts occurrences of each filename.
    """
    result = subprocess.run(
        ['git', 'log', '--name-only', '--pretty=format:', f'--since={since}'],
        cwd=repo_path,
        capture_output=True,
        text=True,
        check=True
    )

    counts = defaultdict(int)
    for line in result.stdout.split('\n'):
        line = line.strip()
        if line:  # Skip empty lines between commits
            counts[line] += 1

    return dict(counts)


# =============================================================================
# APPROACH 3: Bulk git log with --numstat (includes lines changed)
# =============================================================================

def approach3_bulk_numstat(repo_path: str, since: str = "3 months ago") -> dict:
    """
    Get commit count AND lines added/deleted per file using --numstat.

    Returns richer data: {file: {'commits': N, 'added': N, 'deleted': N}}
    """
    result = subprocess.run(
        ['git', 'log', '--numstat', '--pretty=format:', f'--since={since}'],
        cwd=repo_path,
        capture_output=True,
        text=True,
        check=True
    )

    stats = defaultdict(lambda: {'commits': 0, 'added': 0, 'deleted': 0})

    for line in result.stdout.split('\n'):
        line = line.strip()
        if not line:
            continue
        parts = line.split('\t')
        if len(parts) == 3:
            added, deleted, file_path = parts
            # Handle binary files (shown as '-')
            added = int(added) if added != '-' else 0
            deleted = int(deleted) if deleted != '-' else 0
            stats[file_path]['commits'] += 1
            stats[file_path]['added'] += added
            stats[file_path]['deleted'] += deleted

    return dict(stats)


# =============================================================================
# APPROACH 4: Per-file with last commit date
# =============================================================================

def approach4_per_file_with_date(repo_path: str, files: list[str], since: str = "3 months ago") -> dict:
    """
    Get commit count AND last commit date per file.

    This is what we'd need for full schema compliance, but requires 2N calls.
    """
    results = {}
    for file_path in files:
        # Get count
        count_result = subprocess.run(
            ['git', 'rev-list', 'HEAD', '--count', f'--since={since}', '--', file_path],
            cwd=repo_path,
            capture_output=True,
            text=True
        )
        count = int(count_result.stdout.strip()) if count_result.stdout.strip() else 0

        # Get last commit date
        date_result = subprocess.run(
            ['git', 'log', '-1', '--format=%aI', '--', file_path],
            cwd=repo_path,
            capture_output=True,
            text=True
        )
        last_date = date_result.stdout.strip() if date_result.stdout.strip() else None

        results[file_path] = {
            'commits': count,
            'last_commit_date': last_date
        }
    return results


# =============================================================================
# APPROACH 5: Bulk with commit details (hybrid)
# =============================================================================

def approach5_bulk_with_dates(repo_path: str, since: str = "3 months ago") -> dict:
    """
    Get commit count and track last commit date per file in single pass.

    Uses structured format to capture commit dates.
    """
    # Format: COMMIT_MARKER|date then file list
    result = subprocess.run(
        ['git', 'log', '--name-only', '--format=COMMIT|%aI', f'--since={since}'],
        cwd=repo_path,
        capture_output=True,
        text=True,
        check=True
    )

    stats = defaultdict(lambda: {'commits': 0, 'last_commit_date': None})
    current_date = None

    for line in result.stdout.split('\n'):
        line = line.strip()
        if not line:
            continue
        if line.startswith('COMMIT|'):
            current_date = line.split('|', 1)[1]
        else:
            file_path = line
            stats[file_path]['commits'] += 1
            # First occurrence is the most recent (git log is reverse chronological)
            if stats[file_path]['last_commit_date'] is None:
                stats[file_path]['last_commit_date'] = current_date

    return dict(stats)


# =============================================================================
# APPROACH 6: Multiple time periods in bulk
# =============================================================================

def approach6_multiple_periods(repo_path: str) -> dict:
    """
    Get commit counts for multiple time periods efficiently.

    Runs bulk query for longest period, then filters in Python.
    """
    # Get all commits from last year with dates
    result = subprocess.run(
        ['git', 'log', '--name-only', '--format=COMMIT|%aI', '--since=1 year ago'],
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
            except:
                current_timestamp = 0
        else:
            file_path = line
            stats[file_path]['commits_1y'] += 1

            if current_timestamp and current_timestamp >= three_months_ago:
                stats[file_path]['commits_3m'] += 1

            if stats[file_path]['last_commit_date'] is None:
                stats[file_path]['last_commit_date'] = current_date

    return dict(stats)


# =============================================================================
# BENCHMARK RUNNER
# =============================================================================

def run_benchmark(repo_path: str, file_limits: list[int] = [10, 50, 100, 500]):
    """Run all approaches and compare performance."""

    print(f"Repository: {repo_path}")
    print(f"{'='*70}\n")

    all_files = get_all_files(repo_path)
    print(f"Total tracked files: {len(all_files)}\n")

    # Test bulk approaches first (they process all files)
    print("BULK APPROACHES (all files)")
    print("-" * 50)

    # Approach 2: Bulk name-only
    start = time.time()
    result2 = approach2_bulk_name_only(repo_path, "3 months ago")
    elapsed2 = time.time() - start
    print(f"Approach 2 (bulk --name-only):     {elapsed2:.3f}s - {len(result2)} files with commits")

    # Approach 3: Bulk numstat
    start = time.time()
    result3 = approach3_bulk_numstat(repo_path, "3 months ago")
    elapsed3 = time.time() - start
    print(f"Approach 3 (bulk --numstat):       {elapsed3:.3f}s - {len(result3)} files with commits")

    # Approach 5: Bulk with dates
    start = time.time()
    result5 = approach5_bulk_with_dates(repo_path, "3 months ago")
    elapsed5 = time.time() - start
    print(f"Approach 5 (bulk with dates):      {elapsed5:.3f}s - {len(result5)} files with commits")

    # Approach 6: Multiple periods
    start = time.time()
    result6 = approach6_multiple_periods(repo_path)
    elapsed6 = time.time() - start
    print(f"Approach 6 (multiple periods):     {elapsed6:.3f}s - {len(result6)} files with commits")

    print()

    # Test per-file approaches with varying file counts
    print("PER-FILE APPROACHES (varying file counts)")
    print("-" * 50)

    for limit in file_limits:
        files = all_files[:limit]

        # Approach 1: Per-file rev-list
        start = time.time()
        result1 = approach1_per_file(repo_path, files, "3 months ago")
        elapsed1 = time.time() - start

        # Approach 4: Per-file with date
        start = time.time()
        result4 = approach4_per_file_with_date(repo_path, files, "3 months ago")
        elapsed4 = time.time() - start

        print(f"  {limit} files:")
        print(f"    Approach 1 (per-file count):     {elapsed1:.3f}s ({elapsed1/limit*1000:.1f}ms/file)")
        print(f"    Approach 4 (per-file + date):    {elapsed4:.3f}s ({elapsed4/limit*1000:.1f}ms/file)")

    print()

    # Extrapolate for full file set
    print("EXTRAPOLATION TO ALL FILES")
    print("-" * 50)
    per_file_avg = elapsed1 / file_limits[-1]  # Use last (largest) sample
    extrapolated = per_file_avg * len(all_files)
    print(f"Per-file approach estimated for {len(all_files)} files: {extrapolated:.1f}s")
    print(f"Bulk approach actual time: {elapsed5:.3f}s")
    print(f"Speedup factor: {extrapolated/elapsed5:.0f}x")

    print()

    # Sample output
    print("SAMPLE OUTPUT (first 5 files with commits)")
    print("-" * 50)
    sample_files = list(result6.items())[:5]
    for file_path, stats in sample_files:
        print(f"  {file_path}:")
        print(f"    3-month commits: {stats['commits_3m']}")
        print(f"    1-year commits:  {stats['commits_1y']}")
        print(f"    Last commit:     {stats['last_commit_date']}")

    return {
        'bulk_name_only': result2,
        'bulk_numstat': result3,
        'bulk_with_dates': result5,
        'multiple_periods': result6
    }


def verify_correctness(repo_path: str, sample_size: int = 10):
    """Verify bulk approach matches per-file approach."""
    print("\nCORRECTNESS VERIFICATION")
    print("-" * 50)

    files = get_all_files(repo_path, sample_size)

    # Get results from both approaches
    per_file = approach1_per_file(repo_path, files, "3 months ago")
    bulk = approach2_bulk_name_only(repo_path, "3 months ago")

    matches = 0
    mismatches = []

    for file_path in files:
        per_file_count = per_file.get(file_path, 0)
        bulk_count = bulk.get(file_path, 0)

        if per_file_count == bulk_count:
            matches += 1
        else:
            mismatches.append((file_path, per_file_count, bulk_count))

    print(f"Checked {len(files)} files: {matches} matches, {len(mismatches)} mismatches")

    if mismatches:
        print("\nMismatches:")
        for path, pf, b in mismatches[:5]:
            print(f"  {path}: per-file={pf}, bulk={b}")
    else:
        print("✓ All results match!")

    return len(mismatches) == 0


# =============================================================================
# MULTI-REPO ANALYSIS
# =============================================================================

def find_git_repos(root_path: str) -> list[str]:
    """Find all git repositories under a root path."""
    repos = []
    root = Path(root_path)

    # Check if root itself is a repo
    if (root / '.git').is_dir():
        repos.append(str(root))

    # Find nested repos
    for git_dir in root.rglob('.git'):
        if git_dir.is_dir():
            repo_path = str(git_dir.parent)
            if repo_path != str(root):  # Don't double-count root
                repos.append(repo_path)

    return sorted(repos)


def analyze_multi_repo(root_path: str) -> dict:
    """
    Analyze all repositories under a root path.

    Returns combined stats with repo-relative paths.
    """
    repos = find_git_repos(root_path)
    print(f"Found {len(repos)} repositories under {root_path}")

    combined_stats = {}
    root = Path(root_path)

    total_time = 0
    for repo_path in repos:
        repo = Path(repo_path)
        repo_name = repo.relative_to(root) if repo != root else Path('.')

        start = time.time()
        stats = approach6_multiple_periods(repo_path)
        elapsed = time.time() - start
        total_time += elapsed

        # Prefix paths with repo name
        for file_path, file_stats in stats.items():
            full_path = str(repo_name / file_path) if repo_name != Path('.') else file_path
            combined_stats[full_path] = file_stats

        files = get_all_files(repo_path)
        print(f"  {repo_name}: {len(files)} files, {len(stats)} with commits ({elapsed:.3f}s)")

    print(f"\nTotal: {len(combined_stats)} files with commits in {total_time:.3f}s")
    return combined_stats


if __name__ == '__main__':
    import sys

    # Allow passing repo path as argument
    if len(sys.argv) > 1:
        TEST_REPO = sys.argv[1]

    if not os.path.isdir(TEST_REPO):
        print(f"Test repository not found: {TEST_REPO}")
        print("Please update TEST_REPO variable to point to a git repository.")
        exit(1)

    # Check if this is a multi-repo setup
    repos = find_git_repos(TEST_REPO)

    if len(repos) > 1:
        print("MULTI-REPO ANALYSIS")
        print("=" * 70)
        analyze_multi_repo(TEST_REPO)
        print()

    # Run single-repo benchmark on root (or first repo if multi-repo)
    single_repo = repos[0] if repos else TEST_REPO
    os.chdir(single_repo)

    verify_correctness(single_repo)
    print()
    results = run_benchmark(single_repo)
