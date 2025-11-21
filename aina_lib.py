"""Aina library - Core functionality for analysis set management."""
import sqlite3
from pathlib import Path


def init_database(db_path):
    """Initialize database with analysis_sets table.

    Args:
        db_path: Path to SQLite database file

    Returns:
        sqlite3.Connection: Database connection
    """
    # Ensure parent directory exists
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS analysis_sets (
            id INTEGER PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            path TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    return conn


def add_analysis_set(conn, name, path):
    """Add a new analysis set to the database.

    Args:
        conn: sqlite3.Connection
        name: Name for the analysis set (must be unique)
        path: Path to folder containing repositories

    Raises:
        sqlite3.IntegrityError: If name already exists
    """
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO analysis_sets (name, path) VALUES (?, ?)",
        (name, path)
    )
    conn.commit()


def list_analysis_sets(conn):
    """List all analysis sets from the database.

    Args:
        conn: sqlite3.Connection

    Returns:
        List of dicts with 'name' and 'path' keys
    """
    cursor = conn.cursor()
    cursor.execute("SELECT name, path FROM analysis_sets ORDER BY name")
    rows = cursor.fetchall()

    return [{'name': row[0], 'path': row[1]} for row in rows]


def remove_analysis_set(conn, name):
    """Remove an analysis set from the database.

    Args:
        conn: sqlite3.Connection
        name: Name of the analysis set to remove

    Returns:
        bool: True if set was removed, False if not found
    """
    cursor = conn.cursor()
    cursor.execute("DELETE FROM analysis_sets WHERE name = ?", (name,))
    conn.commit()

    return cursor.rowcount > 0


def discover_repos(path):
    """Discover Git repositories in a directory.

    Scans the given path and all subdirectories for .git directories.

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

    for root, dirs, files in path_obj.walk():
        if '.git' in dirs:
            repos.append(str(root))

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
        conn = init_database(db_path)
        add_analysis_set(conn, name, path)
        conn.close()
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
        conn = init_database(db_path)
        sets = list_analysis_sets(conn)
        conn.close()

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
        conn = init_database(db_path)
        success = remove_analysis_set(conn, name)
        conn.close()

        if success:
            print(f"Removed analysis set '{name}'")
            return True
        else:
            print(f"Error: Analysis set '{name}' not found")
            return False
    except Exception as e:
        print(f"Error: {e}")
        return False
