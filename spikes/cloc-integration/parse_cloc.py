#!/usr/bin/env python3
"""
Spike C: Parse cloc output and map to JSON schema structure.

Tests:
1. Parse cloc --json --by-file output
2. Extract file-level data
3. Build hierarchical tree structure
4. Map to our JSON schema format
"""

import json
import sys
from pathlib import Path
from datetime import datetime

def parse_cloc_output(cloc_json_path):
    """Parse cloc --by-file JSON output."""
    with open(cloc_json_path) as f:
        data = json.load(f)

    header = data.get('header', {})
    print(f"=== cloc Header ===")
    print(f"Files: {header.get('n_files')}")
    print(f"Lines: {header.get('n_lines')}")
    print(f"Elapsed: {header.get('elapsed_seconds')}s")
    print()

    # Extract file entries (skip header and SUM)
    files = {k: v for k, v in data.items() if k not in ['header', 'SUM']}

    return header, files

def build_tree_structure(files, base_path):
    """
    Build hierarchical tree from flat file list.

    Args:
        files: Dict of {filepath: {blank, comment, code, language}}
        base_path: Base path to make paths relative

    Returns:
        Tree structure matching our JSON schema
    """
    base = Path(base_path)
    tree = {
        "name": base.name,
        "type": "analysis_set",
        "children": []
    }

    # Group files by repository (first-level subdirectory)
    repos = {}

    for filepath, stats in files.items():
        path = Path(filepath)

        try:
            # Make path relative to base
            rel_path = path.relative_to(base)
        except ValueError:
            # File is outside base path, skip
            continue

        parts = rel_path.parts
        if len(parts) == 0:
            continue

        # First part is the repository name
        repo_name = parts[0]

        if repo_name not in repos:
            repos[repo_name] = {
                "name": repo_name,
                "type": "repository",
                "path": repo_name,
                "files": []
            }

        # Store file with relative path
        repos[repo_name]["files"].append({
            "name": path.name,
            "path": str(rel_path),
            "value": stats.get("code", 0),
            "language": stats.get("language", "Unknown"),
            "extension": path.suffix,
            "blank": stats.get("blank", 0),
            "comment": stats.get("comment", 0)
        })

    # Convert repos dict to list and add to tree
    tree["children"] = list(repos.values())

    return tree

def print_tree_sample(tree, max_files_per_repo=5):
    """Print a sample of the tree structure."""
    print("=== Tree Structure Sample ===")
    print(f"Analysis Set: {tree['name']}")
    print(f"Repositories: {len(tree['children'])}")
    print()

    for repo in tree['children'][:3]:  # Show first 3 repos
        print(f"  {repo['name']} ({len(repo['files'])} files)")

        # Show top N files by LOC
        sorted_files = sorted(repo['files'], key=lambda f: f['value'], reverse=True)
        for file in sorted_files[:max_files_per_repo]:
            print(f"    - {file['name']}: {file['value']:,} lines ({file['language']})")
        print()

def calculate_stats(tree):
    """Calculate aggregate statistics."""
    total_files = 0
    total_lines = 0
    languages = {}

    for repo in tree['children']:
        total_files += len(repo['files'])
        for file in repo['files']:
            total_lines += file['value']
            lang = file['language']
            languages[lang] = languages.get(lang, 0) + file['value']

    return {
        "total_files": total_files,
        "total_lines": total_lines,
        "total_repos": len(tree['children']),
        "languages": languages
    }

def main():
    # Parse cloc output
    cloc_path = Path(__file__).parent / "cloc-by-file-full.json"

    if not cloc_path.exists():
        print(f"Error: {cloc_path} not found")
        print("Run: cloc --json --by-file <path> > cloc-by-file-sample.json")
        return 1

    header, files = parse_cloc_output(cloc_path)

    print(f"=== Parsed Files ===")
    print(f"Total entries: {len(files)}")
    print(f"Sample file paths:")
    for filepath in list(files.keys())[:5]:
        print(f"  {filepath}")
    print()

    # Build tree structure
    base_path = "/Users/t988833/Projects/kjetiljd/meta-repo-workshop/todo-meta"
    tree = build_tree_structure(files, base_path)

    # Print sample
    print_tree_sample(tree)

    # Calculate stats
    stats = calculate_stats(tree)
    print("=== Statistics ===")
    print(f"Total Files: {stats['total_files']:,}")
    print(f"Total Lines: {stats['total_lines']:,}")
    print(f"Total Repos: {stats['total_repos']}")
    print(f"\nTop 5 Languages:")
    sorted_langs = sorted(stats['languages'].items(), key=lambda x: x[1], reverse=True)
    for lang, lines in sorted_langs[:5]:
        print(f"  {lang}: {lines:,} lines")

    # Save full tree to JSON
    output_path = Path(__file__).parent / "tree-structure-sample.json"
    with open(output_path, 'w') as f:
        json.dump({
            "analysis_set": tree["name"],
            "generated_at": datetime.now().isoformat(),
            "stats": stats,
            "tree": tree
        }, f, indent=2)

    print(f"\nFull tree saved to: {output_path}")

    return 0

if __name__ == "__main__":
    sys.exit(main())
