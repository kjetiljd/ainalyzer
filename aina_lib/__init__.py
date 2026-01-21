"""Aina library - Core functionality for analysis set management."""

from .database import Database
from .discovery import discover_repos
from .git_staleness import get_repo_staleness_info, format_staleness_warning
from .git_stats import get_file_stats, get_file_stats_with_follow, get_coupling_data
from .analysis import (
    run_cloc,
    build_directory_tree,
    tree_to_schema,
    analyze_repos,
    generate_analysis_index,
)
from .cli import cmd_add, cmd_list, cmd_remove, cmd_analyze
from .server import create_request_handler, cmd_show

__all__ = [
    # Database
    'Database',
    # Discovery
    'discover_repos',
    # Git staleness
    'get_repo_staleness_info',
    'format_staleness_warning',
    # Git stats
    'get_file_stats',
    'get_file_stats_with_follow',
    'get_coupling_data',
    # Analysis
    'run_cloc',
    'build_directory_tree',
    'tree_to_schema',
    'analyze_repos',
    'generate_analysis_index',
    # CLI
    'cmd_add',
    'cmd_list',
    'cmd_remove',
    'cmd_analyze',
    # Server
    'create_request_handler',
    'cmd_show',
]
