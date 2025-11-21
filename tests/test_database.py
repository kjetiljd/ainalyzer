"""Tests for database operations."""
import unittest
import sqlite3
import tempfile
import os
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from aina_lib import init_database, add_analysis_set, list_analysis_sets, remove_analysis_set


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


class TestListAnalysisSets(unittest.TestCase):
    """Test listing analysis sets."""

    def setUp(self):
        """Create temporary database for testing."""
        self.db_fd, self.db_path = tempfile.mkstemp()
        self.conn = init_database(self.db_path)

    def tearDown(self):
        """Clean up temporary database."""
        self.conn.close()
        os.close(self.db_fd)
        os.unlink(self.db_path)

    def test_list_analysis_sets(self):
        """Test listing analysis sets returns all sets."""
        add_analysis_set(self.conn, 'set1', '/path/one')
        add_analysis_set(self.conn, 'set2', '/path/two')

        results = list_analysis_sets(self.conn)

        self.assertEqual(len(results), 2)
        self.assertEqual(results[0]['name'], 'set1')
        self.assertEqual(results[0]['path'], '/path/one')
        self.assertEqual(results[1]['name'], 'set2')
        self.assertEqual(results[1]['path'], '/path/two')

    def test_list_empty_database(self):
        """Test listing from empty database returns empty list."""
        results = list_analysis_sets(self.conn)

        self.assertEqual(results, [])


class TestRemoveAnalysisSet(unittest.TestCase):
    """Test removing analysis sets."""

    def setUp(self):
        """Create temporary database for testing."""
        self.db_fd, self.db_path = tempfile.mkstemp()
        self.conn = init_database(self.db_path)

    def tearDown(self):
        """Clean up temporary database."""
        self.conn.close()
        os.close(self.db_fd)
        os.unlink(self.db_path)

    def test_remove_analysis_set(self):
        """Test removing an existing analysis set."""
        add_analysis_set(self.conn, 'test-set', '/path/to/repos')

        remove_analysis_set(self.conn, 'test-set')

        results = list_analysis_sets(self.conn)
        self.assertEqual(len(results), 0)

    def test_remove_nonexistent_set(self):
        """Test removing non-existent set returns False."""
        result = remove_analysis_set(self.conn, 'nonexistent')

        self.assertFalse(result)

    def test_remove_returns_true_on_success(self):
        """Test removing existing set returns True."""
        add_analysis_set(self.conn, 'test-set', '/path/to/repos')

        result = remove_analysis_set(self.conn, 'test-set')

        self.assertTrue(result)


if __name__ == '__main__':
    unittest.main()
