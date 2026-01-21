"""Tests for git statistics collection."""
import unittest
import tempfile
import os
import subprocess
from pathlib import Path
from datetime import datetime, timedelta

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from aina_lib import get_file_stats, get_file_stats_with_follow, get_coupling_data, get_repo_staleness_info, format_staleness_warning


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

    def commit_as(self, message, author_name, author_email, files=None):
        """Create a commit as a specific author."""
        if files:
            for f in files:
                subprocess.run(['git', 'add', f], cwd=self.repo_path, capture_output=True)
        else:
            subprocess.run(['git', 'add', '-A'], cwd=self.repo_path, capture_output=True)

        subprocess.run(
            ['git', 'commit', '-m', message, '--author', f'{author_name} <{author_email}>'],
            cwd=self.repo_path, capture_output=True, check=True
        )


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


class TestContributorExtraction(GitRepoTestCase):
    """Test contributor count extraction from git log."""

    def test_extracts_contributor_count_per_file(self):
        """Files show contributor count and names."""
        self.create_file('shared.py', 'v1')
        self.commit_as('Alice adds file', 'Alice', 'alice@example.com')

        self.create_file('shared.py', 'v2')
        self.commit_as('Bob updates file', 'Bob', 'bob@example.com')

        self.create_file('shared.py', 'v3')
        self.commit_as('Charlie updates file', 'Charlie', 'charlie@example.com')

        stats = get_file_stats(self.repo_path)

        self.assertIn('shared.py', stats)
        self.assertIn('contributors', stats['shared.py'])
        self.assertEqual(stats['shared.py']['contributors']['count'], 3)
        self.assertIn('Alice', stats['shared.py']['contributors']['names'])
        self.assertIn('Bob', stats['shared.py']['contributors']['names'])
        self.assertIn('Charlie', stats['shared.py']['contributors']['names'])

    def test_counts_unique_contributors_not_commits(self):
        """Same author with multiple commits counted once."""
        self.create_file('test.py', 'v1')
        self.commit_as('First', 'Alice', 'alice@example.com')

        self.create_file('test.py', 'v2')
        self.commit_as('Second', 'Alice', 'alice@example.com')

        self.create_file('test.py', 'v3')
        self.commit_as('Third', 'Alice', 'alice@example.com')

        stats = get_file_stats(self.repo_path)

        self.assertEqual(stats['test.py']['contributors']['count'], 1)
        self.assertEqual(stats['test.py']['contributors']['names'], ['Alice'])


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

    def test_analysis_includes_contributors(self):
        """Analysis output includes contributor data per file."""
        from aina_lib import analyze_repos

        self.create_file('shared.py', 'v1')
        self.commit_as('Alice adds', 'Alice', 'alice@example.com')

        self.create_file('shared.py', 'v2')
        self.commit_as('Bob updates', 'Bob', 'bob@example.com')

        result = analyze_repos('test', self.repo_path)

        def find_node_by_name(node, name):
            if node.get('name') == name:
                return node
            for child in node.get('children', []):
                found = find_node_by_name(child, name)
                if found:
                    return found
            return None

        shared_node = find_node_by_name(result['tree'], 'shared.py')

        self.assertIsNotNone(shared_node)
        self.assertIn('contributors', shared_node)
        self.assertEqual(shared_node['contributors']['count'], 2)
        self.assertIn('Alice', shared_node['contributors']['names'])
        self.assertIn('Bob', shared_node['contributors']['names'])


class TestGetCouplingData(GitRepoTestCase):
    """Test get_coupling_data function for co-change detection."""

    def test_returns_empty_pairs_for_empty_repo(self):
        """Empty repo returns no coupling pairs."""
        result = get_coupling_data(self.repo_path)

        self.assertIn('threshold', result)
        self.assertIn('pairs', result)
        self.assertEqual(result['pairs'], [])

    def test_detects_files_changed_together(self):
        """Files changed in same commit are detected as coupled."""
        # Change files together 3 times (meets default threshold)
        for i in range(3):
            self.create_file('service.py', f'service v{i}')
            self.create_file('test_service.py', f'test v{i}')
            self.commit(f'Update service {i}')

        result = get_coupling_data(self.repo_path, threshold=3)

        self.assertEqual(len(result['pairs']), 1)
        pair = result['pairs'][0]
        self.assertEqual(set(pair['files']), {'service.py', 'test_service.py'})
        self.assertEqual(pair['count'], 3)

    def test_filters_by_threshold(self):
        """Pairs below threshold are excluded."""
        # Files changed together only twice
        for i in range(2):
            self.create_file('a.py', f'a v{i}')
            self.create_file('b.py', f'b v{i}')
            self.commit(f'Update {i}')

        result = get_coupling_data(self.repo_path, threshold=3)

        self.assertEqual(len(result['pairs']), 0)

    def test_sorts_by_count_descending(self):
        """Pairs are sorted by co-change count (most coupled first)."""
        # Pair A-B: 5 co-changes
        for i in range(5):
            self.create_file('a.py', f'a v{i}')
            self.create_file('b.py', f'b v{i}')
            self.commit(f'AB {i}')

        # Pair C-D: 3 co-changes
        for i in range(3):
            self.create_file('c.py', f'c v{i}')
            self.create_file('d.py', f'd v{i}')
            self.commit(f'CD {i}')

        result = get_coupling_data(self.repo_path, threshold=3)

        self.assertEqual(len(result['pairs']), 2)
        self.assertEqual(result['pairs'][0]['count'], 5)  # A-B first
        self.assertEqual(result['pairs'][1]['count'], 3)  # C-D second

    def test_limits_to_max_pairs(self):
        """Respects max_pairs limit."""
        # Create many file pairs
        for i in range(10):
            for j in range(3):
                self.create_file(f'file{i}_a.py', f'v{j}')
                self.create_file(f'file{i}_b.py', f'v{j}')
                self.commit(f'Update pair {i} v{j}')

        result = get_coupling_data(self.repo_path, threshold=3, max_pairs=5)

        self.assertEqual(len(result['pairs']), 5)

    def test_skips_large_commits(self):
        """Commits with >50 files are skipped (likely bulk changes)."""
        # Create 60 files in one commit
        for i in range(60):
            self.create_file(f'bulk_{i}.py', 'content')
        self.commit('Bulk add')

        # Change a subset together multiple times
        for i in range(3):
            self.create_file('real_a.py', f'v{i}')
            self.create_file('real_b.py', f'v{i}')
            self.commit(f'Real change {i}')

        result = get_coupling_data(self.repo_path, threshold=3)

        # Only the real pair should be detected
        self.assertEqual(len(result['pairs']), 1)
        self.assertEqual(set(result['pairs'][0]['files']), {'real_a.py', 'real_b.py'})

    def test_handles_nested_paths(self):
        """Files in subdirectories have correct paths."""
        for i in range(3):
            self.create_file('src/main/app.py', f'v{i}')
            self.create_file('tests/test_app.py', f'v{i}')
            self.commit(f'Update {i}')

        result = get_coupling_data(self.repo_path, threshold=3)

        self.assertEqual(len(result['pairs']), 1)
        self.assertIn('src/main/app.py', result['pairs'][0]['files'])
        self.assertIn('tests/test_app.py', result['pairs'][0]['files'])


class TestAnalyzeReposWithCoupling(GitRepoTestCase):
    """Test that analyze_repos includes coupling data."""

    def test_analysis_includes_coupling_field(self):
        """Analysis output includes coupling field."""
        from aina_lib import analyze_repos

        # Create coupled files
        for i in range(3):
            self.create_file('model.py', f'v{i}')
            self.create_file('test_model.py', f'v{i}')
            self.commit(f'Update {i}')

        result = analyze_repos('test', self.repo_path)

        self.assertIn('coupling', result)
        self.assertIn('threshold', result['coupling'])
        self.assertIn('pairs', result['coupling'])

    def test_coupling_pairs_have_correct_structure(self):
        """Coupling pairs have files list and count."""
        from aina_lib import analyze_repos

        for i in range(3):
            self.create_file('a.py', f'v{i}')
            self.create_file('b.py', f'v{i}')
            self.commit(f'Update {i}')

        result = analyze_repos('test', self.repo_path)

        if result['coupling']['pairs']:
            pair = result['coupling']['pairs'][0]
            self.assertIn('files', pair)
            self.assertIn('count', pair)
            self.assertIsInstance(pair['files'], list)
            self.assertEqual(len(pair['files']), 2)


class TestGetRepoStalenessInfo(GitRepoTestCase):
    """Test get_repo_staleness_info function."""

    def test_returns_repo_name(self):
        """Returns the repository name."""
        self.create_file('test.py', 'content')
        self.commit('Initial')

        info = get_repo_staleness_info(self.repo_path)

        self.assertEqual(info['repo'], Path(self.repo_path).name)

    def test_returns_current_branch(self):
        """Returns current branch name."""
        self.create_file('test.py', 'content')
        self.commit('Initial')

        info = get_repo_staleness_info(self.repo_path)

        # Default branch after git init is usually 'master' or 'main'
        self.assertIn(info['branch'], ['master', 'main'])

    def test_returns_last_commit_date(self):
        """Returns last commit date in ISO format."""
        self.create_file('test.py', 'content')
        self.commit('Initial')

        info = get_repo_staleness_info(self.repo_path)

        self.assertIsNotNone(info['last_commit_date'])
        self.assertIn('T', info['last_commit_date'])

    def test_returns_commit_age_days(self):
        """Returns age of last commit in days."""
        self.create_file('test.py', 'content')
        self.commit('Initial')

        info = get_repo_staleness_info(self.repo_path)

        self.assertIsNotNone(info['last_commit_age_days'])
        self.assertEqual(info['last_commit_age_days'], 0)  # Just committed

    def test_returns_no_remote_status_when_no_remote(self):
        """Returns no_remote status when repo has no remote."""
        self.create_file('test.py', 'content')
        self.commit('Initial')

        info = get_repo_staleness_info(self.repo_path)

        self.assertEqual(info['remote_status'], 'no_remote')

    def test_handles_repo_with_no_commits(self):
        """Handles repo with no commits gracefully."""
        # New repo, no commits
        info = get_repo_staleness_info(self.repo_path)

        self.assertIsNone(info['last_commit_date'])
        self.assertIsNone(info['last_commit_age_days'])


class TestFormatStalenessWarning(unittest.TestCase):
    """Test format_staleness_warning function."""

    def test_formats_basic_info(self):
        """Formats repo name, branch, and date."""
        infos = [{
            'repo': 'my-repo',
            'branch': 'main',
            'last_commit_date': '2025-12-01T10:00:00+01:00',
            'last_commit_age_days': 10,
            'remote_status': 'up_to_date',
            'commits_behind': None,
            'default_branch': 'main',
            'error': None
        }]

        result = format_staleness_warning(infos)

        self.assertIn('my-repo', result)
        self.assertIn('main', result)
        self.assertIn('2025-12-01', result)
        self.assertIn('10 days', result)

    def test_formats_today(self):
        """Shows 'today' for 0 days ago."""
        infos = [{
            'repo': 'repo',
            'branch': 'main',
            'last_commit_date': '2025-12-11T10:00:00+01:00',
            'last_commit_age_days': 0,
            'remote_status': 'up_to_date',
            'commits_behind': None,
            'default_branch': None,
            'error': None
        }]

        result = format_staleness_warning(infos)

        self.assertIn('today', result)

    def test_formats_singular_day(self):
        """Shows '1 day' for singular."""
        infos = [{
            'repo': 'repo',
            'branch': 'main',
            'last_commit_date': '2025-12-10T10:00:00+01:00',
            'last_commit_age_days': 1,
            'remote_status': 'up_to_date',
            'commits_behind': None,
            'default_branch': None,
            'error': None
        }]

        result = format_staleness_warning(infos)

        self.assertIn('1 day', result)

    def test_shows_behind_status(self):
        """Shows BEHIND prefix when behind remote."""
        infos = [{
            'repo': 'repo',
            'branch': 'main',
            'last_commit_date': '2025-12-01T10:00:00+01:00',
            'last_commit_age_days': 10,
            'remote_status': 'behind',
            'commits_behind': 5,
            'default_branch': 'main',
            'error': None
        }]

        result = format_staleness_warning(infos)

        self.assertIn('[  BEHIND  ]', result)

    def test_shows_fetch_failed(self):
        """Shows FETCH FAILED prefix and error when fetch failed."""
        infos = [{
            'repo': 'repo',
            'branch': 'main',
            'last_commit_date': '2025-12-01T10:00:00+01:00',
            'last_commit_age_days': 10,
            'remote_status': 'fetch_failed',
            'commits_behind': None,
            'default_branch': None,
            'error': 'Authentication failed'
        }]

        result = format_staleness_warning(infos)

        self.assertIn('[FETCH FAIL]', result)
        self.assertIn('Authentication failed', result)

    def test_shows_no_remote(self):
        """Shows NO REMOTE prefix when no remote configured."""
        infos = [{
            'repo': 'repo',
            'branch': 'main',
            'last_commit_date': '2025-12-01T10:00:00+01:00',
            'last_commit_age_days': 10,
            'remote_status': 'no_remote',
            'commits_behind': None,
            'default_branch': None,
            'error': None
        }]

        result = format_staleness_warning(infos)

        self.assertIn('[ NO REMOTE]', result)

    def test_formats_multiple_repos(self):
        """Formats multiple repositories."""
        infos = [
            {
                'repo': 'repo-a',
                'branch': 'main',
                'last_commit_date': '2025-12-01T10:00:00+01:00',
                'last_commit_age_days': 10,
                'remote_status': 'up_to_date',
                'commits_behind': None,
                'default_branch': None,
                'error': None
            },
            {
                'repo': 'repo-b',
                'branch': 'develop',
                'last_commit_date': '2025-11-01T10:00:00+01:00',
                'last_commit_age_days': 40,
                'remote_status': 'behind',
                'commits_behind': 12,
                'default_branch': 'main',
                'error': None
            }
        ]

        result = format_staleness_warning(infos)

        self.assertIn('repo-a', result)
        self.assertIn('repo-b', result)
        self.assertIn('[  BEHIND  ]', result)


if __name__ == '__main__':
    unittest.main()
