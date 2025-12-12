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

    try:
        database = Database(db_path)
        database.add_analysis_set(name, path)
        print(f"Added analysis set '{name}' -> {path}")
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
            return True
        else:
            print(f"Error: Analysis set '{name}' not found")
            return False
    except Exception as e:
        print(f"Error: {e}")
        return False


def cmd_analyze(name, path, db_path):
    """Analyze an analysis set and generate JSON.

    First time: path is required, registers the analysis set.
    Subsequent times: path is optional, uses stored path.
    If path provided differs from stored path, errors.

    Args:
        name: Name for the analysis set
        path: Path to folder (required first time, optional after)
        db_path: Path to SQLite database

    Returns:
        bool: True if successful, False on error
    """
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
            try:
                database.add_analysis_set(name, path)
                print(f"Registered '{name}' -> {path}")
            except sqlite3.IntegrityError:
                print(f"Error: Analysis set '{name}' already exists")
                return False
            analysis_set_path = path

        print(f"Analyzing '{name}' at {analysis_set_path}")

        analysis_json = analyze_repos(name, analysis_set_path)

        output_dir = Path.home() / '.aina' / 'analysis'
        output_dir.mkdir(parents=True, exist_ok=True)

        output_path = output_dir / f"{name}.json"

        with open(output_path, 'w') as f:
            json.dump(analysis_json, f, indent=2)

        generate_analysis_index()

        stats = analysis_json['stats']
        print(f"\nAnalysis complete!")
        print(f"  Repositories: {stats['total_repos']}")
        print(f"  Files: {stats['total_files']:,}")
        print(f"  Lines of code: {stats['total_lines']:,}")
        print(f"\nOutput: {output_path}")

        return True

    except FileNotFoundError as e:
        print(f"Error: {e}")
        return False
    except ValueError as e:
        print(f"Error: {e}")
        return False
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False
