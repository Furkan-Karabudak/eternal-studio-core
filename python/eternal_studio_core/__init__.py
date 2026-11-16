"""Python interface to the compiled Rust ``eternal_studio_core`` engine."""

from __future__ import annotations

from ._core import __version__, core_version, health_check

__all__ = ["__version__", "core_version", "health_check"]
