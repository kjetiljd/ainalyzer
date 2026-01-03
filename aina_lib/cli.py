"""CLI command implementations."""
import sqlite3
import json
from pathlib import Path

from .database import Database
from .analysis import analyze_repos, generate_analysis_index


def cmd_add(name, path, db_path):
    """Add a new analysis set.

    Args:
        name: Name for the analysis set
        path: Path to folder containing repositories
        db_path: Path to SQLite database

    Returns:
        bool: True if successful, False on error
    """
    if not Path(path).exists():
        print(f"Error: Path does not exist: {path}")
        return False

    # Convert to absolute path for storage
    absolute_path = str(Path(path).resolve())

    try:
        database = Database(db_path)
        database.add_analysis_set(name, absolute_path)
        print(f"Added analysis set '{name}' -> {absolute_path}")
        return True
    except sqlite3.IntegrityError:
        print(f"Error: Analysis set '{name}' already exists")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False


def cmd_list(db_path):
    """List all analysis sets.

    Args:
        db_path: Path to SQLite database

    Returns:
        bool: True if successful, False on error
    """
    try:
        database = Database(db_path)
        sets = database.list_analysis_sets()

        if not sets:
            print("No analysis sets registered.")
        else:
            print(f"{'Name':<20} Path")
            print("-" * 60)
            for s in sets:
                print(f"{s['name']:<20} {s['path']}")

        return True
    except Exception as e:
        print(f"Error: {e}")
        return False


def cmd_remove(name, db_path):
    """Remove an analysis set.

    Args:
        name: Name of the analysis set to remove
        db_path: Path to SQLite database

    Returns:
        bool: True if successful, False on error
    """
    try:
        database = Database(db_path)
        success = database.remove_analysis_set(name)

        if success:
            print(f"Removed analysis set '{name}'")

            # Also remove the JSON file if it exists
            json_path = Path.home() / '.aina' / 'analysis' / f'{name}.json'
            if json_path.exists():
                json_path.unlink()
                print(f"Removed {json_path}")
                generate_analysis_index()

            return True
        else:
            print(f"Error: Analysis set '{name}' not found")
            return False
    except Exception as e:
        print(f"Error: {e}")
        return False


def _run_single_analysis(name, analysis_set_path, interactive=True, quiet=False):
    """Run analysis for a single set.

    Args:
        name: Name of the analysis set
        analysis_set_path: Path to folder containing repositories
        interactive: If True, prompt on staleness warnings
        quiet: If True, suppress per-set output

    Returns:
        tuple: (success, stats_or_error)
            - On success: (True, {'total_repos': N, 'total_files': N, 'total_lines': N})
            - On failure: (False, 'error message')
    """
    on_progress = (lambda msg: None) if quiet else print

    def handle_staleness(staleness_infos, behind_count):
        if not quiet:
            print(f">>> {behind_count} repositor{'ies are' if behind_count > 1 else 'y is'} behind remote.")
            print(">>> Consider running 'git pull' before analyzing.")
        if interactive:
            print()
            try:
                input(">>> Press Enter to continue, or Ctrl-C to abort... ")
            except KeyboardInterrupt:
                print("\nAborted.")
                raise SystemExit(1)

    try:
        if not quiet:
            print(f"Analyzing '{name}' at {analysis_set_path}")

        analysis_json = analyze_repos(
            name, analysis_set_path,
            on_staleness_warning=handle_staleness,
            on_progress=on_progress
        )

        output_dir = Path.home() / '.aina' / 'analysis'
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / f"{name}.json"

        with open(output_path, 'w') as f:
            json.dump(analysis_json, f, indent=2)

        stats = analysis_json['stats']
        if not quiet:
            print(f"\nAnalysis complete!")
            print(f"  Repositories: {stats['total_repos']}")
            print(f"  Files: {stats['total_files']:,}")
            print(f"  Lines of code: {stats['total_lines']:,}")
            print(f"\nOutput: {output_path}")

        return True, stats

    except FileNotFoundError as e:
        return False, str(e)
    except ValueError as e:
        return False, str(e)
    except Exception as e:
        return False, str(e)


def _analyze_all(db_path, yes=False, quiet=False):
    """Analyze all registered analysis sets.

    Args:
        db_path: Path to SQLite database
        yes: If True, skip interactive prompts
        quiet: If True, summary output only (implies yes)

    Returns:
        bool: True if all succeeded, False if any failed
    """
    # quiet implies non-interactive
    interactive = not (yes or quiet)

    try:
        database = Database(db_path)
        sets = database.list_analysis_sets()

        if not sets:
            print("No analysis sets registered.")
            return True

        if not quiet:
            print(f"Analyzing {len(sets)} analysis set(s)...\n")

        results = []
        for i, analysis_set in enumerate(sets, 1):
            name = analysis_set['name']
            path = analysis_set['path']

            if not quiet:
                print("=" * 60)
                print(f"[{i}/{len(sets)}] {name}")
                print("=" * 60)

            if not Path(path).exists():
                results.append({
                    'name': name,
                    'success': False,
                    'error': f"Path does not exist: {path}"
                })
                if not quiet:
                    print(f"Error: Path does not exist: {path}\n")
                continue

            success, data = _run_single_analysis(name, path, interactive=interactive, quiet=quiet)
            if success:
                results.append({
                    'name': name,
                    'success': True,
                    'stats': data
                })
            else:
                results.append({
                    'name': name,
                    'success': False,
                    'error': data
                })
                if not quiet:
                    print(f"Error: {data}\n")

            if not quiet:
                print()

        # Generate index once at end
        generate_analysis_index()

        # Print summary
        succeeded = sum(1 for r in results if r['success'])
        failed = len(results) - succeeded

        print("=" * 60)
        print(f"Reanalysis complete: {succeeded} succeeded, {failed} failed")
        print()

        # Summary table
        print(f"  {'NAME':<20} {'STATUS':<10} {'REPOS':>6} {'FILES':>8} {'LOC':>12}")
        print("  " + "-" * 58)

        total_repos = 0
        total_files = 0
        total_lines = 0

        for r in results:
            if r['success']:
                stats = r['stats']
                repos = stats.get('total_repos', 0)
                files = stats.get('total_files', 0)
                lines = stats.get('total_lines', 0)
                total_repos += repos
                total_files += files
                total_lines += lines
                print(f"  {r['name']:<20} {'OK':<10} {repos:>6} {files:>8,} {lines:>12,}")
            else:
                error = r['error'][:30] + '...' if len(r['error']) > 30 else r['error']
                print(f"  {r['name']:<20} {'FAILED':<10} {error}")

        if succeeded > 0:
            print("  " + "-" * 58)
            print(f"  {'Total':<20} {'':<10} {total_repos:>6} {total_files:>8,} {total_lines:>12,}")

        return failed == 0

    except Exception as e:
        print(f"Error: {e}")
        return False


def cmd_analyze(name, path, db_path, all_sets=False, yes=False, quiet=False):
    """Analyze an analysis set and generate JSON.

    First time: path is required, registers the analysis set.
    Subsequent times: path is optional, uses stored path.
    If path provided differs from stored path, errors.

    Args:
        name: Name for the analysis set (None if --all)
        path: Path to folder (required first time, optional after)
        db_path: Path to SQLite database
        all_sets: If True, analyze all registered sets
        yes: If True, skip interactive prompts
        quiet: If True, summary output only (implies yes)

    Returns:
        bool: True if successful, False on error
    """
    if all_sets:
        return _analyze_all(db_path, yes=yes, quiet=quiet)

    # quiet implies non-interactive
    interactive = not (yes or quiet)

    try:
        database = Database(db_path)
        analysis_set = database.get_analysis_set(name)

        if analysis_set:
            stored_path = analysis_set['path']
            if path and Path(path).resolve() != Path(stored_path).resolve():
                print(f"Error: Path mismatch for '{name}'")
                print(f"  Stored: {stored_path}")
                print(f"  Given:  {path}")
                print(f"Use 'aina remove {name}' first to change the path.")
                return False
            analysis_set_path = stored_path
        else:
            if not path:
                print(f"Error: Analysis set '{name}' not found.")
                print(f"Provide a path to create it: aina analyze {name} /path/to/repos")
                return False
            if not Path(path).exists():
                print(f"Error: Path does not exist: {path}")
                return False
            # Convert to absolute path for storage
            absolute_path = str(Path(path).resolve())
            try:
                database.add_analysis_set(name, absolute_path)
                print(f"Registered '{name}' -> {absolute_path}")
            except sqlite3.IntegrityError:
                print(f"Error: Analysis set '{name}' already exists")
                return False
            analysis_set_path = absolute_path

        success, data = _run_single_analysis(name, analysis_set_path, interactive=interactive, quiet=quiet)

        if success:
            generate_analysis_index()
            return True
        else:
            print(f"Error: {data}")
            return False

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False
