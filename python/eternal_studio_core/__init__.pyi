from typing import TypedDict

class CoreHealth(TypedDict):
    status: str
    version: str
    target_os: str
    target_arch: str
    cpu_threads: int

__version__: str

def core_version() -> str: ...
def health_check() -> CoreHealth: ...
