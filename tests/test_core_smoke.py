"""Smoke tests for the compiled eternal_studio_core Python bindings."""

from __future__ import annotations

import tomllib
import unittest
from pathlib import Path

import eternal_studio_core

REPO_ROOT = Path(__file__).resolve().parents[1]


class CoreSmokeTests(unittest.TestCase):
    """Verify Rust native bindings load and match repository version metadata."""

    def test_version_matches_manifests(self) -> None:
        pyproject_data = tomllib.loads((REPO_ROOT / "pyproject.toml").read_text(encoding="utf-8"))
        cargo_data = tomllib.loads((REPO_ROOT / "Cargo.toml").read_text(encoding="utf-8"))

        expected = pyproject_data["project"]["version"]
        self.assertEqual(cargo_data["package"]["version"], expected)
        self.assertEqual(eternal_studio_core.__version__, expected)
        self.assertEqual(eternal_studio_core.core_version(), expected)

    def test_health_check_reports_ok(self) -> None:
        status = eternal_studio_core.health_check()
        self.assertEqual(status["status"], "ok")
        self.assertEqual(status["version"], eternal_studio_core.__version__)
        self.assertTrue(status["target_os"])
        self.assertTrue(status["target_arch"])
        self.assertGreaterEqual(status["cpu_threads"], 1)


if __name__ == "__main__":
    unittest.main()
