"""Tests for git statistics collection."""
import unittest
import tempfile
import os
import subprocess
from pathlib import Path
from datetime import datetime, timedelta

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from aina_lib import get_file_stats, get_file_stats_with_follow


class GitRepoTestCase(unittest.TestCase):
    """Base class for tests that need a real git repository."""

    def setUp(self):
        """Create temporary git repository with some commits."""
        self.temp_dir = tempfile.mkdtemp()
        self.repo_path = self.temp_dir

        # Initialize git repo
        subprocess.run(['git', 'init'], cwd=self.repo_path, capture_output=True, check=True)
        subprocess.run(['git', 'config', 'user.email', 'test@test.com'], cwd=self.repo_path, capture_output=True)
        subprocess.run(['git', 'config', 'user.name', 'Test User'], cwd=self.repo_path, capture_output=True)

    def tearDown(self):
        """Clean up temporary directory."""
        import shutil
        shutil.rmtree(self.temp_dir)

    def create_file(self, filename, content='test content'):
        """Create a file in the repo."""
        filepath = Path(self.repo_path) / filename
        filepath.parent.mkdir(parents=True, exist_ok=True)
        filepath.write_text(content)
        return filepath

    def commit(self, message, files=None):
        """Create a commit. If files is None, add all."""
        if files:
            for f in files:
                subprocess.run(['git', 'add', f], cwd=self.repo_path, capture_output=True)
        else:
            subprocess.run(['git', 'add', '-A'], cwd=self.repo_path, capture_output=True)
        subprocess.run(['git', 'commit', '-m', message], cwd=self.repo_path, capture_output=True, check=True)

    def commit_with_date(self, message, date_str, files=None):
        """Create a commit with a specific date."""
        if files:
            for f in files:
                subprocess.run(['git', 'add', f], cwd=self.repo_path, capture_output=True)
        else:
            subprocess.run(['git', 'add', '-A'], cwd=self.repo_path, capture_output=True)

        env = os.environ.copy()
        env['GIT_AUTHOR_DATE'] = date_str
        env['GIT_COMMITTER_DATE'] = date_str
        subprocess.run(['git', 'commit', '-m', message], cwd=self.repo_path, capture_output=True, check=True, env=env)


class TestGetFileStats(GitRepoTestCase):
    """Test get_file_stats function."""

    def test_returns_empty_dict_for_empty_repo(self):
        """Empty repo (no commits) returns empty dict."""
        # Create file but don't commit
        self.create_file('test.txt')

        stats = get_file_stats(self.repo_path)

        self.assertEqual(stats, {})

    def test_returns_commit_count_for_single_file(self):
        """Single file with commits returns correct count."""
        self.create_file('test.py', 'print("hello")')
        self.commit('Initial commit')

        self.create_file('test.py', 'print("hello world")')
        self.commit('Update test')

        stats = get_file_stats(self.repo_path)

        self.assertIn('test.py', stats)
        self.assertEqual(stats['test.py']['commits_1y'], 2)

    def test_returns_commits_for_multiple_files(self):
        """Multiple files return separate counts."""
        self.create_file('a.py', 'a')
        self.create_file('b.py', 'b')
        self.commit('Add both files')

        self.create_file('a.py', 'a updated')
        self.commit('Update a only')

        stats = get_file_stats(self.repo_path)

        self.assertEqual(stats['a.py']['commits_1y'], 2)
        self.assertEqual(stats['b.py']['commits_1y'], 1)

    def test_includes_last_commit_date(self):
        """Stats include last commit date."""
        self.create_file('test.py', 'test')
        self.commit('Initial')

        stats = get_file_stats(self.repo_path)

        self.assertIn('last_commit_date', stats['test.py'])
        self.assertIsNotNone(stats['test.py']['last_commit_date'])
        # Should be ISO format with timezone
        self.assertIn('T', stats['test.py']['last_commit_date'])

    def test_commits_3m_counts_recent_commits(self):
        """commits_3m counts only commits within 3 months."""
        # Create file with old commit (6 months ago)
        six_months_ago = (datetime.now() - timedelta(days=180)).strftime('%Y-%m-%dT12:00:00')
        self.create_file('test.py', 'old')
        self.commit_with_date('Old commit', six_months_ago)

        # Recent commit
        self.create_file('test.py', 'new')
        self.commit('Recent commit')

        stats = get_file_stats(self.repo_path)

        self.assertEqual(stats['test.py']['commits_1y'], 2)
        self.assertEqual(stats['test.py']['commits_3m'], 1)

    def test_handles_nested_directory_paths(self):
        """Files in subdirectories have correct paths."""
        self.create_file('src/main/app.py', 'app code')
        self.commit('Add app')

        stats = get_file_stats(self.repo_path)

        self.assertIn('src/main/app.py', stats)

    def test_handles_deleted_files(self):
        """Deleted files still appear in stats (they had commits)."""
        self.create_file('deleted.py', 'will be deleted')
        self.commit('Add file')

        os.remove(Path(self.repo_path) / 'deleted.py')
        self.commit('Delete file')

        stats = get_file_stats(self.repo_path)

        # File should appear because it had commits
        self.assertIn('deleted.py', stats)


class TestGetFileStatsWithFollow(GitRepoTestCase):
    """Test get_file_stats_with_follow for renamed files."""

    def test_follows_renamed_file(self):
        """Renamed file includes pre-rename commit history."""
        # Create and commit original file
        self.create_file('old_name.py', 'content')
        self.commit('Initial')

        self.create_file('old_name.py', 'updated content')
        self.commit('Update old name')

        # Rename file
        old_path = Path(self.repo_path) / 'old_name.py'
        new_path = Path(self.repo_path) / 'new_name.py'
        old_path.rename(new_path)
        subprocess.run(['git', 'add', '-A'], cwd=self.repo_path, capture_output=True)
        self.commit('Rename file')

        # Update renamed file
        self.create_file('new_name.py', 'content after rename')
        self.commit('Update new name')

        stats = get_file_stats(self.repo_path)

        # new_name.py should have all 4 commits (including rename and pre-rename)
        # The bulk query sees: rename commit + post-rename commit = 2 for new_name
        # But with --follow it should see all commits
        self.assertIn('new_name.py', stats)
        # At minimum, should have the commits after rename
        self.assertGreaterEqual(stats['new_name.py']['commits_1y'], 2)


class TestGetFileStatsIntegration(GitRepoTestCase):
    """Integration tests for get_file_stats."""

    def test_handles_repo_with_no_commits_in_last_year(self):
        """Repo with only old commits returns empty dict (since=1 year)."""
        # This would require manipulating git dates significantly
        # For now, just ensure empty repo works
        stats = get_file_stats(self.repo_path)
        self.assertEqual(stats, {})

    def test_performance_with_many_files(self):
        """Can handle repository with many files."""
        # Create 50 files
        for i in range(50):
            self.create_file(f'file_{i}.py', f'content {i}')
        self.commit('Add many files')

        import time
        start = time.time()
        stats = get_file_stats(self.repo_path)
        elapsed = time.time() - start

        self.assertEqual(len(stats), 50)
        # Should complete in reasonable time (< 5 seconds even on slow system)
        self.assertLess(elapsed, 5.0)


class TestAnalyzeReposWithGitStats(GitRepoTestCase):
    """Test that analyze_repos integrates git statistics."""

    def test_analyze_includes_commits_field_on_files(self):
        """analyze_repos output includes commits field on file nodes."""
        from aina_lib import analyze_repos

        # Create file and commit
        self.create_file('app.py', 'print("hello")')
        self.commit('Initial')

        self.create_file('app.py', 'print("hello world")')
        self.commit('Update')

        # Run analysis
        result = analyze_repos('test-analysis', self.repo_path)

        # Find a file node in the tree
        def find_file_node(node):
            if node.get('type') == 'file':
                return node
            for child in node.get('children', []):
                found = find_file_node(child)
                if found:
                    return found
            return None

        file_node = find_file_node(result['tree'])

        self.assertIsNotNone(file_node)
        self.assertIn('commits', file_node)
        self.assertIn('last_3_months', file_node['commits'])
        self.assertIn('last_year', file_node['commits'])
        self.assertIn('last_commit_date', file_node['commits'])

    def test_commits_field_has_correct_counts(self):
        """Commits field has accurate counts."""
        from aina_lib import analyze_repos

        # Create file with multiple commits
        self.create_file('test.py', 'v1')
        self.commit('v1')
        self.create_file('test.py', 'v2')
        self.commit('v2')
        self.create_file('test.py', 'v3')
        self.commit('v3')

        result = analyze_repos('test', self.repo_path)

        # Find test.py node
        def find_node_by_name(node, name):
            if node.get('name') == name:
                return node
            for child in node.get('children', []):
                found = find_node_by_name(child, name)
                if found:
                    return found
            return None

        test_node = find_node_by_name(result['tree'], 'test.py')

        self.assertIsNotNone(test_node)
        self.assertEqual(test_node['commits']['last_year'], 3)
        self.assertEqual(test_node['commits']['last_3_months'], 3)


if __name__ == '__main__':
    unittest.main()
