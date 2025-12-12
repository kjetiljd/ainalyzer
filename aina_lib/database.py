"""Database operations for analysis sets."""
import sqlite3
from pathlib import Path


class Database:

    def __init__(self, db_path):
        """Initialize database with analysis_sets table.

        Args:
            db_path: Path to SQLite database file
        """
        self.db_path = db_path
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    def _connect(self):
        """Create a new database connection."""
        return sqlite3.connect(self.db_path)

    def _init_schema(self):
        """Initialize database schema."""
        with self._connect() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS analysis_sets (
                    id INTEGER PRIMARY KEY,
                    name TEXT UNIQUE NOT NULL,
                    path TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()

    def list_analysis_sets(self):
        """List all analysis sets from the database.

        Returns:
            List of dicts with 'name' and 'path' keys
        """
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT name, path FROM analysis_sets ORDER BY name")
            rows = cursor.fetchall()
            return [{'name': row[0], 'path': row[1]} for row in rows]

    def add_analysis_set(self, name, path):
        """Add a new analysis set to the database.

        Args:
            name: Name for the analysis set (must be unique)
            path: Path to folder containing repositories

        Raises:
            sqlite3.IntegrityError: If name already exists
        """
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO analysis_sets (name, path) VALUES (?, ?)",
                (name, path)
            )
            conn.commit()

    def remove_analysis_set(self, name):
        """Remove an analysis set from the database.

        Args:
            name: Name of the analysis set to remove

        Returns:
            bool: True if set was removed, False if not found
        """
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM analysis_sets WHERE name = ?", (name,))
            conn.commit()
            return cursor.rowcount > 0

    def get_analysis_set(self, name):
        """Get an analysis set by name.

        Args:
            name: Name of the analysis set

        Returns:
            dict with 'name' and 'path' keys, or None if not found
        """
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT name, path FROM analysis_sets WHERE name = ?", (name,))
            row = cursor.fetchone()
            return {'name': row[0], 'path': row[1]} if row else None
