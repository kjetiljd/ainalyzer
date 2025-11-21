"""Tests for database operations."""
import unittest
import sqlite3
import tempfile
import os
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from aina_lib import init_database, add_analysis_set


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


class TestAddAnalysisSet(unittest.TestCase):
    """Test adding analysis sets."""

    def setUp(self):
        """Create temporary database for testing."""
        self.db_fd, self.db_path = tempfile.mkstemp()
        self.conn = init_database(self.db_path)

    def tearDown(self):
        """Clean up temporary database."""
        self.conn.close()
        os.close(self.db_fd)
        os.unlink(self.db_path)

    def test_add_analysis_set(self):
        """Test adding a new analysis set."""
        add_analysis_set(self.conn, 'test-set', '/path/to/repos')

        cursor = self.conn.cursor()
        cursor.execute("SELECT name, path FROM analysis_sets WHERE name = ?", ('test-set',))
        result = cursor.fetchone()

        self.assertIsNotNone(result)
        self.assertEqual(result[0], 'test-set')
        self.assertEqual(result[1], '/path/to/repos')

    def test_add_duplicate_name_fails(self):
        """Test that adding duplicate name raises error."""
        add_analysis_set(self.conn, 'test-set', '/path/to/repos')

        with self.assertRaises(sqlite3.IntegrityError):
            add_analysis_set(self.conn, 'test-set', '/different/path')


if __name__ == '__main__':
    unittest.main()
