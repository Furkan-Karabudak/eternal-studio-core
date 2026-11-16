//! Thin PyO3 FFI boundary exposing `eternal_studio_core._core` to Python.

mod engine;

use pyo3::prelude::*;
use pyo3::types::PyDict;

/// Return the compiled native core crate version.
#[pyfunction]
fn core_version() -> &'static str {
    engine::crate_version()
}

/// Return diagnostic metadata about the active Rust native runtime.
#[pyfunction]
fn health_check(py: Python<'_>) -> PyResult<Py<PyDict>> {
    let health = engine::build_health_status();
    let dict = PyDict::new(py);
    dict.set_item("status", health.status)?;
    dict.set_item("version", health.version)?;
    dict.set_item("target_os", health.target_os)?;
    dict.set_item("target_arch", health.target_arch)?;
    dict.set_item("cpu_threads", health.cpu_threads)?;
    Ok(dict.unbind())
}

/// Native module entry point for `eternal_studio_core._core`.
#[pymodule]
fn _core(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add("__version__", engine::crate_version())?;
    m.add_function(wrap_pyfunction!(core_version, m)?)?;
    m.add_function(wrap_pyfunction!(health_check, m)?)?;
    Ok(())
}
