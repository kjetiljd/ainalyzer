"""Repository discovery functions."""
from pathlib import Path


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
        depth = len(Path(root).relative_to(path_obj).parts)

        if '.git' in dirs:
            repos.append(str(root))

        if depth >= max_depth:
            dirs.clear()

    return sorted(repos)
