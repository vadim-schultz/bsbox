from __future__ import annotations

import os
import platform
import subprocess
import sys
import venv
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VENV_DIR = ROOT / ".venv"
HOST = os.getenv("HOST", "127.0.0.1")
PORT = os.getenv("PORT", "8000")


def venv_python() -> Path:
    if platform.system().lower().startswith("win"):
        return VENV_DIR / "Scripts" / "python.exe"
    return VENV_DIR / "bin" / "python"


def ensure_venv() -> Path:
    if not VENV_DIR.exists():
        print(f"[setup] Creating virtualenv at {VENV_DIR}")
        venv.create(VENV_DIR, with_pip=True, clear=False, upgrade_deps=False)
    py = venv_python()
    if not py.exists():
        raise RuntimeError(f"Virtualenv python not found at {py}")
    return py


def install_deps(py: Path) -> None:
    print("[setup] Installing dependencies with pip install -e .")
    subprocess.check_call([str(py), "-m", "pip", "install", "-e", "."], cwd=ROOT)


def start_server(py: Path) -> None:
    print(f"[run] Starting server on {HOST}:{PORT}")
    subprocess.check_call(
        [
            str(py),
            "-m",
            "uvicorn",
            "app.main:app",
            "--reload",
            "--host",
            HOST,
            "--port",
            PORT,
        ],
        cwd=ROOT,
    )


def main() -> None:
    os.chdir(ROOT)
    py = ensure_venv()
    install_deps(py)
    start_server(py)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n[run] Stopped by user")
    except Exception as exc:  # pragma: no cover - convenience for script
        print(f"[error] {exc}")
        sys.exit(1)
