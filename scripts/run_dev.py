#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import List

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"
VENV_DIR = BACKEND_DIR / ".venv"


def ensure_backend_venv() -> Path:
    if not VENV_DIR.exists():
        print(f"[run-dev] Creating virtual environment at {VENV_DIR}")
        subprocess.run([sys.executable, "-m", "venv", str(VENV_DIR)], check=True)

    venv_python = VENV_DIR / "bin" / "python"
    if not venv_python.exists():
        venv_python = VENV_DIR / "Scripts" / "python.exe"  # Windows fallback

    print("[run-dev] Installing backend in editable mode")
    subprocess.run([str(venv_python), "-m", "pip", "install", "--upgrade", "pip"], check=True)
    subprocess.run([str(venv_python), "-m", "pip", "install", "-e", str(BACKEND_DIR)], check=True)
    return venv_python


def ensure_frontend_deps() -> None:
    if not (FRONTEND_DIR / "node_modules").exists():
        print("[run-dev] Installing frontend dependencies with npm")
        subprocess.run(["npm", "install"], cwd=FRONTEND_DIR, check=True)


def launch_process(cmd: List[str], env: dict[str, str] | None = None, cwd: Path | None = None) -> subprocess.Popen:
    process_env = os.environ.copy()
    if env:
        process_env.update(env)
    return subprocess.Popen(cmd, cwd=cwd, env=process_env)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run backend and frontend dev servers together.")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind both services (default: 127.0.0.1)")
    parser.add_argument("--backend-port", type=int, default=8000, help="Backend port (default: 8000)")
    parser.add_argument("--frontend-port", type=int, default=5173, help="Frontend port (default: 5173)")
    parser.add_argument(
        "--api-base",
        default=None,
        help="Frontend API base URL override (default: http://<host>:<backend_port>)",
    )
    args = parser.parse_args()

    venv_python = ensure_backend_venv()
    ensure_frontend_deps()

    api_base = args.api_base or f"http://{args.host}:{args.backend_port}"

    processes: list[subprocess.Popen] = []

    try:
        backend_cmd = [
            str(venv_python),
            "-m",
            "uvicorn",
            "app.main:create_app",
            "--host",
            args.host,
            "--port",
            str(args.backend_port),
            "--reload",
        ]
        print("[run-dev] Starting backend:", " ".join(backend_cmd))
        backend_proc = launch_process(backend_cmd, cwd=BACKEND_DIR)
        processes.append(backend_proc)

        frontend_env = {"VITE_API_BASE": api_base}
        frontend_cmd = ["npm", "run", "dev", "--", "--host", args.host, "--port", str(args.frontend_port)]
        print("[run-dev] Starting frontend:", " ".join(frontend_cmd))
        frontend_proc = launch_process(frontend_cmd, env=frontend_env, cwd=FRONTEND_DIR)
        processes.append(frontend_proc)

        print("[run-dev] Backend: http://%s:%s" % (args.host, args.backend_port))
        print("[run-dev] Frontend: http://%s:%s" % (args.host, args.frontend_port))
        print("[run-dev] Press Ctrl+C to stop both processes.")

        while True:
            for proc in processes:
                ret = proc.poll()
                if ret is not None:
                    raise RuntimeError(f"Process {' '.join(proc.args)} exited with code {ret}")
            time.sleep(0.5)
    except KeyboardInterrupt:
        print("\n[run-dev] Stopping processes...")
    except Exception as exc:  # noqa: BLE001
        print(f"[run-dev] Error: {exc}")
    finally:
        for proc in processes:
            if proc.poll() is None:
                proc.terminate()
        for proc in processes:
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()


if __name__ == "__main__":
    main()
