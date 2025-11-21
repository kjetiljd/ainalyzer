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
