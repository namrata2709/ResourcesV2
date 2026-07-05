"""
conftest.py — makes python/ importable from tests/ so test files can do
`import generate_quiz_index` etc. without installing anything as a package.
"""

import sys
import os

PYTHON_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PYTHON_DIR not in sys.path:
    sys.path.insert(0, PYTHON_DIR)
