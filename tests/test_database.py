"""Tests for database operations."""
import unittest
import sqlite3
import tempfile
import os
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from aina_lib import Database


class DatabaseTestCase(unittest.TestCase):
    """Base class for database tests with common setup/teardown."""

    def setUp(self):
        """Create temporary database for testing."""
        self.db_fd, self.db_path = tempfile.mkstemp()

    def tearDown(self):
        """Clean up temporary database."""
        if hasattr(self, 'conn') and self.conn:
            self.conn.close()
        os.close(self.db_fd)
        os.unlink(self.db_path)


class TestDatabaseInit(DatabaseTestCase):
    """Test database initialization."""

    def test_init_database_creates_table(self):
        """Test that init_database creates analysis_sets table."""
        database = Database(self.db_path)

        with database._connect() as conn:
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



class TestAddAnalysisSet(DatabaseTestCase):
    """Test adding analysis sets."""

    def setUp(self):
        """Create temporary database for testing."""
        super().setUp()
        self.database = Database(self.db_path)

    def test_add_analysis_set(self):
        """Test adding a new analysis set."""
        self.database.add_analysis_set('test-set', '/path/to/repos')

        with self.database._connect() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT name, path FROM analysis_sets WHERE name = ?", ('test-set',))
            result = cursor.fetchone()

        self.assertIsNotNone(result)
        self.assertEqual(result[0], 'test-set')
        self.assertEqual(result[1], '/path/to/repos')

    def test_add_duplicate_name_fails(self):
        """Test that adding duplicate name raises error."""
        self.database.add_analysis_set('test-set', '/path/to/repos')

        with self.assertRaises(sqlite3.IntegrityError):
            self.database.add_analysis_set('test-set', '/different/path')


class TestListAnalysisSets(DatabaseTestCase):
    """Test listing analysis sets."""

    def setUp(self):
        """Create temporary database for testing."""
        super().setUp()
        self.database = Database(self.db_path)

    def test_list_analysis_sets(self):
        """Test listing analysis sets returns all sets."""
        self.database.add_analysis_set('set1', '/path/one')
        self.database.add_analysis_set('set2', '/path/two')

        results = self.database.list_analysis_sets()

        self.assertEqual(len(results), 2)
        self.assertEqual(results[0]['name'], 'set1')
        self.assertEqual(results[0]['path'], '/path/one')
        self.assertEqual(results[1]['name'], 'set2')
        self.assertEqual(results[1]['path'], '/path/two')

    def test_list_empty_database(self):
        """Test listing from empty database returns empty list."""
        results = self.database.list_analysis_sets()

        self.assertEqual(results, [])


class TestRemoveAnalysisSet(DatabaseTestCase):
    """Test removing analysis sets."""

    def setUp(self):
        """Create temporary database for testing."""
        super().setUp()
        self.database = Database(self.db_path)

    def test_remove_analysis_set(self):
        """Test removing an existing analysis set."""
        self.database.add_analysis_set('test-set', '/path/to/repos')

        self.database.remove_analysis_set('test-set')

        results = self.database.list_analysis_sets()
        self.assertEqual(len(results), 0)

    def test_remove_nonexistent_set(self):
        """Test removing non-existent set returns False."""
        result = self.database.remove_analysis_set('nonexistent')

        self.assertFalse(result)

    def test_remove_returns_true_on_success(self):
        """Test removing existing set returns True."""
        self.database.add_analysis_set('test-set', '/path/to/repos')

        result = self.database.remove_analysis_set('test-set')

        self.assertTrue(result)


if __name__ == '__main__':
    unittest.main()
