"""Tests for CLI command wrappers."""
import unittest
import tempfile
import os
from pathlib import Path
import sqlite3

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from aina_lib import cmd_add, cmd_list, cmd_remove


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
        from aina_lib import Database
        database = Database(self.db_path)
        sets = database.list_analysis_sets()

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
        from aina_lib import Database
        database = Database(self.db_path)
        sets = database.list_analysis_sets()


        self.assertEqual(len(sets), 0)

    def test_cmd_remove_nonexistent(self):
        """Test removing non-existent set."""
        result = cmd_remove('nonexistent', self.db_path)

        self.assertFalse(result)

class TestCmdAnalyzeAll(unittest.TestCase):
    """Test the analyze --all functionality."""

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

    def test_analyze_all_no_sets(self):
        """Test --all with no registered sets."""
        from aina_lib.cli import _analyze_all

        result = _analyze_all(self.db_path)

        self.assertTrue(result)

    def test_analyze_all_with_sets(self):
        """Test --all analyzes all registered sets."""
        from aina_lib.cli import _analyze_all
        from aina_lib import Database
        from unittest.mock import patch

        # Register two sets
        database = Database(self.db_path)
        database.add_analysis_set('set1', self.temp_dir)
        database.add_analysis_set('set2', self.temp_dir)

        # Mock analyze_repos to avoid actual analysis
        mock_result = {
            'analysis_set': 'test',
            'stats': {'total_repos': 1, 'total_files': 10, 'total_lines': 100}
        }

        with patch('aina_lib.cli.analyze_repos', return_value=mock_result):
            result = _analyze_all(self.db_path, quiet=True)

        self.assertTrue(result)

    def test_analyze_all_continues_on_failure(self):
        """Test --all continues when one set fails."""
        from aina_lib.cli import _analyze_all
        from aina_lib import Database
        from unittest.mock import patch

        # Register two sets, one with non-existent path
        database = Database(self.db_path)
        database.add_analysis_set('good-set', self.temp_dir)
        database.add_analysis_set('bad-set', '/nonexistent/path')

        # Mock analyze_repos for the good set
        mock_result = {
            'analysis_set': 'test',
            'stats': {'total_repos': 1, 'total_files': 10, 'total_lines': 100}
        }

        with patch('aina_lib.cli.analyze_repos', return_value=mock_result):
            result = _analyze_all(self.db_path, quiet=True)

        # Should return False because one failed
        self.assertFalse(result)


if __name__ == '__main__':
    unittest.main()
