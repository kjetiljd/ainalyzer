"""Tests for database operations."""
import unittest
import sqlite3
import tempfile
import os
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from aina_lib import init_database


class TestDatabaseInit(unittest.TestCase):
    """Test database initialization."""

    def setUp(self):
        """Create temporary database for testing."""
        self.db_fd, self.db_path = tempfile.mkstemp()

    def tearDown(self):
        """Clean up temporary database."""
        os.close(self.db_fd)
        os.unlink(self.db_path)

    def test_init_database_creates_table(self):
        """Test that init_database creates analysis_sets table."""
        conn = init_database(self.db_path)
        cursor = conn.cursor()

        # Check table exists
        cursor.execute("""
            SELECT name FROM sqlite_master
            WHERE type='table' AND name='analysis_sets'
        """)
        result = cursor.fetchone()

        self.assertIsNotNone(result)
        self.assertEqual(result[0], 'analysis_sets')

        # Check table schema
        cursor.execute("PRAGMA table_info(analysis_sets)")
        columns = {row[1]: row[2] for row in cursor.fetchall()}

        self.assertIn('id', columns)
        self.assertIn('name', columns)
        self.assertIn('path', columns)
        self.assertIn('created_at', columns)

        conn.close()


if __name__ == '__main__':
    unittest.main()
