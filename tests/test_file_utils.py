"""Tests for file_utils module."""
import unittest
import tempfile
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from aina_lib.file_utils import detect_file_encoding


class TestDetectFileEncoding(unittest.TestCase):
    """Test file encoding detection."""

    def setUp(self):
        """Create temporary directory for test files."""
        self.temp_dir = tempfile.mkdtemp()

    def tearDown(self):
        """Clean up temporary directory."""
        import shutil
        shutil.rmtree(self.temp_dir)

    def test_detect_utf8(self):
        """Test detection of UTF-8 encoded file."""
        path = Path(self.temp_dir) / 'utf8.txt'
        path.write_text('Blåbærsyltetøy - Norwegian UTF-8', encoding='utf-8')

        encoding = detect_file_encoding(path)

        self.assertEqual(encoding, 'utf-8')

    def test_detect_latin1(self):
        """Test detection of ISO-8859-1 (Latin-1) encoded file."""
        path = Path(self.temp_dir) / 'latin1.txt'
        # Write raw Latin-1 bytes: å=0xe5, æ=0xe6, ø=0xf8
        path.write_bytes(b'Bl\xe5b\xe6rsyltet\xf8y - Norwegian Latin-1')

        encoding = detect_file_encoding(path)

        self.assertEqual(encoding, 'iso-8859-1')

    def test_detect_ascii(self):
        """Test detection of plain ASCII file."""
        path = Path(self.temp_dir) / 'ascii.txt'
        path.write_text('Plain ASCII text with no special chars')

        encoding = detect_file_encoding(path)

        self.assertEqual(encoding, 'us-ascii')

    def test_detect_binary_returns_none(self):
        """Test that binary files return None."""
        path = Path(self.temp_dir) / 'binary.bin'
        # Write bytes that are clearly binary (full byte range)
        path.write_bytes(bytes(range(256)))

        encoding = detect_file_encoding(path)

        self.assertIsNone(encoding)

    def test_nonexistent_file_returns_fallback(self):
        """Test that non-existent file returns utf-8 fallback."""
        path = Path(self.temp_dir) / 'does_not_exist.txt'

        encoding = detect_file_encoding(path)

        self.assertEqual(encoding, 'utf-8')

    def test_empty_file(self):
        """Test detection of empty file."""
        path = Path(self.temp_dir) / 'empty.txt'
        path.write_bytes(b'')

        encoding = detect_file_encoding(path)

        # Empty files are typically detected as binary or have a fallback
        # Accept either us-ascii, binary (None), or utf-8 fallback
        self.assertIn(encoding, ['us-ascii', 'utf-8', None])

    def test_encoding_compatible_with_python_codecs(self):
        """Test that detected encoding can be used with Python open()."""
        path = Path(self.temp_dir) / 'latin1.txt'
        original_text = 'Blåbærsyltetøy'
        # Write as Latin-1 bytes
        path.write_bytes(original_text.encode('latin-1'))

        encoding = detect_file_encoding(path)

        # Should be able to read file with detected encoding
        with path.open('r', encoding=encoding) as f:
            content = f.read()

        self.assertEqual(content, original_text)


class TestDetectFileEncodingEdgeCases(unittest.TestCase):
    """Edge case tests for encoding detection."""

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()

    def tearDown(self):
        import shutil
        shutil.rmtree(self.temp_dir)

    def test_utf8_with_bom(self):
        """Test UTF-8 file with BOM."""
        path = Path(self.temp_dir) / 'utf8bom.txt'
        # UTF-8 BOM: 0xEF 0xBB 0xBF
        path.write_bytes(b'\xef\xbb\xbfHello with BOM')

        encoding = detect_file_encoding(path)

        # Should detect as utf-8 (with or without -sig suffix)
        self.assertIn(encoding, ['utf-8', 'utf-8-sig'])

    def test_mixed_content_file(self):
        """Test file with mostly ASCII but some high bytes."""
        path = Path(self.temp_dir) / 'mixed.txt'
        # Mostly ASCII with one Latin-1 char
        path.write_bytes(b'Hello world with one special char: \xe5')

        encoding = detect_file_encoding(path)

        # Should detect as Latin-1 due to the high byte
        self.assertEqual(encoding, 'iso-8859-1')


if __name__ == '__main__':
    unittest.main()