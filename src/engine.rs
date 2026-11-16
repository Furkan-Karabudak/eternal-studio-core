//! Pure Rust core primitives independent of Python FFI bindings.

use std::thread;

/// Snapshot of runtime core engine metadata returned by `health_check`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CoreHealth {
    pub status: &'static str,
    pub version: &'static str,
    pub target_os: &'static str,
    pub target_arch: &'static str,
    pub cpu_threads: usize,
}

/// Returns the semantic version compiled into the native library from `Cargo.toml`.
#[must_use]
pub const fn crate_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

/// Builds a diagnostic health snapshot describing the active native runtime.
#[must_use]
pub fn build_health_status() -> CoreHealth {
    let cpu_threads = thread::available_parallelism()
        .map(std::num::NonZeroUsize::get)
        .unwrap_or(1);

    CoreHealth {
        status: "ok",
        version: crate_version(),
        target_os: std::env::consts::OS,
        target_arch: std::env::consts::ARCH,
        cpu_threads,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn health_status_reports_ok_and_valid_threads() {
        let health = build_health_status();
        assert_eq!(health.status, "ok");
        assert_eq!(health.version, env!("CARGO_PKG_VERSION"));
        assert!(!health.target_os.is_empty());
        assert!(!health.target_arch.is_empty());
        assert!(health.cpu_threads >= 1);
    }
}
