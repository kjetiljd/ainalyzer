"""Tests for repository discovery."""
import unittest
import tempfile
import os
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from aina_lib import discover_repos


class TestDiscoverRepos(unittest.TestCase):
    """Test repository discovery functionality."""

    def setUp(self):
        """Create temporary directory structure for testing."""
        self.temp_dir = tempfile.mkdtemp()

    def tearDown(self):
        """Clean up temporary directory."""
        import shutil
        shutil.rmtree(self.temp_dir)

    def test_discover_single_repo(self):
        """Test discovering a single Git repository."""
        # Create a .git directory
        repo_path = Path(self.temp_dir) / 'repo1'
        repo_path.mkdir()
        (repo_path / '.git').mkdir()

        repos = discover_repos(self.temp_dir)

        self.assertEqual(len(repos), 1)
        self.assertEqual(repos[0], str(repo_path))

    def test_discover_multiple_repos(self):
        """Test discovering multiple Git repositories."""
        # Create multiple repos
        repo1 = Path(self.temp_dir) / 'repo1'
        repo2 = Path(self.temp_dir) / 'repo2'
        repo1.mkdir()
        repo2.mkdir()
        (repo1 / '.git').mkdir()
        (repo2 / '.git').mkdir()

        repos = discover_repos(self.temp_dir)

        self.assertEqual(len(repos), 2)
        self.assertIn(str(repo1), repos)
        self.assertIn(str(repo2), repos)

    def test_discover_nested_repos(self):
        """Test that nested repos beyond depth limit are not found."""
        # Create nested structure
        parent = Path(self.temp_dir) / 'parent'
        child = parent / 'child'
        child.mkdir(parents=True)
        (parent / '.git').mkdir()
        (child / '.git').mkdir()

        repos = discover_repos(self.temp_dir)

        # With depth limit, only parent (depth 1) should be found, not child (depth 2)
        self.assertEqual(len(repos), 1)
        self.assertIn(str(parent), repos)
        self.assertNotIn(str(child), repos)

    def test_discover_no_repos(self):
        """Test discovering in directory with no repositories."""
        # Create some directories but no .git
        (Path(self.temp_dir) / 'not-a-repo').mkdir()

        repos = discover_repos(self.temp_dir)

        self.assertEqual(repos, [])

    def test_discover_nonexistent_path(self):
        """Test that non-existent path raises ValueError."""
        with self.assertRaises(ValueError):
            discover_repos('/nonexistent/path')

    def test_discover_respects_depth_limit(self):
        """Test that discovery stops at depth 2 (root + 1 level)."""
        # Create deeply nested structure
        # Level 0: temp_dir/.git (should find)
        # Level 1: temp_dir/repo1/.git (should find)
        # Level 2: temp_dir/repo1/nested/.git (should NOT find)

        root = Path(self.temp_dir)
        (root / '.git').mkdir()

        repo1 = root / 'repo1'
        repo1.mkdir()
        (repo1 / '.git').mkdir()

        nested = repo1 / 'nested'
        nested.mkdir()
        (nested / '.git').mkdir()

        repos = discover_repos(self.temp_dir)

        # Should find root and repo1, but not nested
        self.assertEqual(len(repos), 2)
        self.assertIn(str(root), repos)
        self.assertIn(str(repo1), repos)
        self.assertNotIn(str(nested), repos)


if __name__ == '__main__':
    unittest.main()
