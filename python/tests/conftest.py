import sys, os
PYTHON_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PYTHON_DIR not in sys.path:
    sys.path.insert(0, PYTHON_DIR)

# The pipeline scripts resolve their data paths relative to the CURRENT directory
# (e.g. "../web/public/data/config/subjects.json"), because they are designed to be
# run from python/. Importing generate_notes outside python/ therefore dies with
# "subjects.json not found" before a single test runs (the 2026-11 deploy failure:
# `pytest python/tests/` started from the repo root). Pin the working directory so
# the suite behaves the same wherever it is started from.
os.chdir(PYTHON_DIR)
