"""File utility functions."""
import subprocess
from pathlib import Path


def detect_file_encoding(path: Path) -> str:
    """Detect file encoding using system file command.

    Uses macOS/Linux `file -b --mime-encoding` for detection.
    Returns encoding name compatible with Python's codecs, or 'utf-8' as fallback.
    Returns None for binary files.

    Args:
        path: Path to the file to detect encoding for.

    Returns:
        Encoding name (e.g., 'utf-8', 'iso-8859-1', 'us-ascii') or None for binary.
    """
    try:
        result = subprocess.run(
            ['file', '-b', '--mime-encoding', str(path)],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            encoding = result.stdout.strip()
            # file returns error messages to stdout with exit code 0
            if encoding.startswith('cannot open'):
                return 'utf-8'
            if encoding == 'binary':
                return None
            return encoding
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass
    return 'utf-8'