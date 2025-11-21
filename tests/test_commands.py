"""Tests for CLI command wrappers."""
import unittest
import tempfile
import os
from pathlib import Path
import sqlite3

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from aina_lib import cmd_add, cmd_list, cmd_remove, list_analysis_sets


class TestCmdAdd(unittest.TestCase):
    """Test the add command wrapper."""

    def setUp(self):
        """Create temporary database and directories for testing."""
        self.db_fd, self.db_path = tempfile.mkstemp()
        self.temp_dir = tempfile.mkdtemp()

    def tearDown(self):
        """Clean up temporary files."""
        os.close(self.db_fd)
        os.unlink(self.db_path)
        import shutil
        shutil.rmtree(self.temp_dir)

    def test_cmd_add_success(self):
        """Test adding a valid analysis set."""
        result = cmd_add('test-set', self.temp_dir, self.db_path)

        self.assertTrue(result)

        # Verify it was added to database
        from aina_lib import init_database
        conn = init_database(self.db_path)
        sets = list_analysis_sets(conn)
        conn.close()

        self.assertEqual(len(sets), 1)
        self.assertEqual(sets[0]['name'], 'test-set')
        self.assertEqual(sets[0]['path'], self.temp_dir)

    def test_cmd_add_nonexistent_path(self):
        """Test adding non-existent path fails."""
        result = cmd_add('test-set', '/nonexistent/path', self.db_path)

        self.assertFalse(result)

    def test_cmd_add_duplicate_name(self):
        """Test adding duplicate name fails."""
        cmd_add('test-set', self.temp_dir, self.db_path)

        result = cmd_add('test-set', self.temp_dir, self.db_path)

        self.assertFalse(result)


class TestCmdList(unittest.TestCase):
    """Test the list command wrapper."""

    def setUp(self):
        """Create temporary database for testing."""
        self.db_fd, self.db_path = tempfile.mkstemp()
        self.temp_dir = tempfile.mkdtemp()

    def tearDown(self):
        """Clean up temporary files."""
        os.close(self.db_fd)
        os.unlink(self.db_path)
        import shutil
        shutil.rmtree(self.temp_dir)

    def test_cmd_list_success(self):
        """Test listing analysis sets."""
        # Add some sets
        cmd_add('set1', self.temp_dir, self.db_path)
        cmd_add('set2', self.temp_dir, self.db_path)

        result = cmd_list(self.db_path)

        self.assertTrue(result)

    def test_cmd_list_empty(self):
        """Test listing empty database."""
        result = cmd_list(self.db_path)

        self.assertTrue(result)


class TestCmdRemove(unittest.TestCase):
    """Test the remove command wrapper."""

    def setUp(self):
        """Create temporary database for testing."""
        self.db_fd, self.db_path = tempfile.mkstemp()
        self.temp_dir = tempfile.mkdtemp()

    def tearDown(self):
        """Clean up temporary files."""
        os.close(self.db_fd)
        os.unlink(self.db_path)
        import shutil
        shutil.rmtree(self.temp_dir)

    def test_cmd_remove_success(self):
        """Test removing an existing analysis set."""
        cmd_add('test-set', self.temp_dir, self.db_path)

        result = cmd_remove('test-set', self.db_path)

        self.assertTrue(result)

        # Verify it was removed
        from aina_lib import init_database
        conn = init_database(self.db_path)
        sets = list_analysis_sets(conn)
        conn.close()

        self.assertEqual(len(sets), 0)

    def test_cmd_remove_nonexistent(self):
        """Test removing non-existent set."""
        result = cmd_remove('nonexistent', self.db_path)

        self.assertFalse(result)


if __name__ == '__main__':
    unittest.main()
