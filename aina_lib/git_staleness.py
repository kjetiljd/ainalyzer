"""Git repository staleness detection."""
import subprocess
from pathlib import Path
from datetime import datetime, timezone


def get_repo_staleness_info(repo_path):
    """Check repository staleness and remote status.

    Args:
        repo_path: Path to git repository

    Returns:
        dict with:
            'repo': repository name
            'branch': current local branch name
            'last_commit_date': ISO 8601 date of last commit
            'last_commit_age_days': days since last commit
            'remote_status': 'behind', 'up_to_date', 'no_remote', 'fetch_failed'
            'commits_behind': number of commits behind (if known)
            'default_branch': detected default branch name (main/master/etc)
            'error': error message if fetch failed
    """
    repo_name = Path(repo_path).name
    info = {
        'repo': repo_name,
        'branch': None,
        'last_commit_date': None,
        'last_commit_age_days': None,
        'remote_status': 'unknown',
        'commits_behind': None,
        'default_branch': None,
        'error': None
    }

    # Get current branch
    result = subprocess.run(
        ['git', 'rev-parse', '--abbrev-ref', 'HEAD'],
        cwd=repo_path,
        capture_output=True,
        text=True
    )
    if result.returncode == 0:
        info['branch'] = result.stdout.strip()

    # Get last commit date
    result = subprocess.run(
        ['git', 'log', '-1', '--format=%aI'],
        cwd=repo_path,
        capture_output=True,
        text=True
    )
    if result.returncode == 0 and result.stdout.strip():
        info['last_commit_date'] = result.stdout.strip()
        try:
            dt = datetime.fromisoformat(info['last_commit_date'].replace('Z', '+00:00'))
            age_days = (datetime.now(timezone.utc) - dt).days
            info['last_commit_age_days'] = age_days
        except ValueError:
            pass

    # Check if remote exists
    result = subprocess.run(
        ['git', 'remote'],
        cwd=repo_path,
        capture_output=True,
        text=True
    )
    if result.returncode != 0 or not result.stdout.strip():
        info['remote_status'] = 'no_remote'
        return info

    # Try to detect default branch from remote HEAD
    result = subprocess.run(
        ['git', 'symbolic-ref', 'refs/remotes/origin/HEAD'],
        cwd=repo_path,
        capture_output=True,
        text=True
    )
    if result.returncode == 0:
        ref = result.stdout.strip()
        if ref.startswith('refs/remotes/origin/'):
            info['default_branch'] = ref.replace('refs/remotes/origin/', '')

    # If symbolic-ref failed, check for common branch names
    if not info['default_branch']:
        for branch_name in ['main', 'master', 'trunk', 'dev']:
            check = subprocess.run(
                ['git', 'rev-parse', '--verify', f'refs/remotes/origin/{branch_name}'],
                cwd=repo_path,
                capture_output=True,
                text=True
            )
            if check.returncode == 0:
                info['default_branch'] = branch_name
                break

    # Try git fetch --dry-run to check for updates
    result = subprocess.run(
        ['git', 'fetch', '--dry-run'],
        cwd=repo_path,
        capture_output=True,
        text=True,
        timeout=30
    )

    if result.returncode != 0:
        info['remote_status'] = 'fetch_failed'
        stderr = result.stderr.strip()
        if stderr:
            info['error'] = stderr.split('\n')[0]
        return info

    # Check if fetch output indicates updates available
    fetch_output = result.stderr.strip()
    if fetch_output and 'From' in fetch_output:
        info['remote_status'] = 'behind'
        # Try to count commits behind
        if info['branch']:
            count_result = subprocess.run(
                ['git', 'rev-list', '--count', f'{info["branch"]}..origin/{info["branch"]}'],
                cwd=repo_path,
                capture_output=True,
                text=True
            )
            if count_result.returncode == 0 and count_result.stdout.strip():
                try:
                    info['commits_behind'] = int(count_result.stdout.strip())
                except ValueError:
                    pass
            elif info['default_branch'] and info['default_branch'] != info['branch']:
                count_result = subprocess.run(
                    ['git', 'rev-list', '--count', f'{info["branch"]}..origin/{info["default_branch"]}'],
                    cwd=repo_path,
                    capture_output=True,
                    text=True
                )
                if count_result.returncode == 0 and count_result.stdout.strip():
                    try:
                        info['commits_behind'] = int(count_result.stdout.strip())
                    except ValueError:
                        pass
    else:
        info['remote_status'] = 'up_to_date'

    return info


def format_staleness_warning(staleness_infos):
    """Format staleness info into a table.

    Args:
        staleness_infos: List of dicts from get_repo_staleness_info

    Returns:
        str: Formatted table, or empty string if no repos
    """
    if not staleness_infos:
        return ''

    rows = []
    errors = []

    for info in staleness_infos:
        repo = info['repo']
        branch = info['branch'] or '(detached)'
        last_date = info['last_commit_date']
        age_days = info['last_commit_age_days']
        status = info['remote_status']

        if age_days is not None:
            if age_days == 0:
                age_str = 'today'
            elif age_days == 1:
                age_str = '1 day'
            else:
                age_str = f'{age_days} days'
        else:
            age_str = '?'

        date_str = last_date[:10] if last_date else 'unknown'

        if status == 'behind':
            status_str = '[  BEHIND  ]'
        elif status == 'fetch_failed':
            status_str = '[FETCH FAIL]'
            if info.get('error'):
                errors.append(f"  {repo}: {info['error']}")
        elif status == 'no_remote':
            status_str = '[ NO REMOTE]'
        else:
            status_str = '[UP TO DATE]'

        rows.append((status_str, repo, branch, date_str, age_str))

    col_widths = [
        max(len(row[0]) for row in rows),
        max(len(row[1]) for row in rows),
        max(len(row[2]) for row in rows),
        max(len(row[3]) for row in rows),
        max(len(row[4]) for row in rows),
    ]

    lines = []
    header = f"  {'STATUS':<{col_widths[0]}}  {'REPOSITORY':<{col_widths[1]}}  {'BRANCH':<{col_widths[2]}}  {'LAST LOCAL COMMIT':<{col_widths[3] + col_widths[4] + 4}}"
    lines.append(header)
    lines.append('  ' + '-' * (len(header) - 2))

    for row in rows:
        line = f"  {row[0]}  {row[1]:<{col_widths[1]}}  {row[2]:<{col_widths[2]}}  {row[3]}  ({row[4]:>{col_widths[4]}})"
        lines.append(line)

    if errors:
        lines.append('')
        lines.append('  Fetch errors:')
        lines.extend(errors)

    return '\n'.join(lines)
