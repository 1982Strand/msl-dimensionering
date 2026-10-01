"""Read the approved Git commit in isolation; never run the working legacy app."""
from __future__ import annotations

import contextlib
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import zipfile

COMMIT = "a330cfd6734ac2478be1304a362c69f94e412d25"
ROOT = Path(__file__).resolve().parents[1]


def write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")


@contextlib.contextmanager
def legacy_source(repository: Path):
    """A fresh archive excludes ignored user data and any uncommitted changes."""
    archive = subprocess.run(
        ["git", "-C", str(repository), "archive", "--format=zip", COMMIT],
        check=True, capture_output=True,
    ).stdout
    with tempfile.TemporaryDirectory(prefix="msl_reference_") as directory:
        source = Path(directory).resolve()
        with zipfile.ZipFile(io.BytesIO(archive)) as bundle:
            for entry in bundle.infolist():
                target = (source / entry.filename).resolve()
                if not target.is_relative_to(source):
                    raise ValueError("Unsafe path in reference archive")
            bundle.extractall(source)
        # Reference must start from built-in defaults, even if tracking changes later.
        if list(source.glob("*_brugerdefineret.json")):
            raise ValueError("Reference commit unexpectedly contains local user state")
        previous_directory = Path.cwd()
        previous_path = list(sys.path)
        os.chdir(source)
        sys.path.insert(0, str(source))
        try:
            yield source
        finally:
            os.chdir(previous_directory)
            sys.path[:] = previous_path
            for name in list(sys.modules):
                module_path = getattr(sys.modules[name], "__file__", None)
                if module_path and Path(module_path).resolve().is_relative_to(source):
                    sys.modules.pop(name, None)


def source_manifest(source: Path) -> dict:
    files = [source / "app.py", source / "ui.py", *sorted((source / "core").glob("*.py"))]
    return {
        "commit": COMMIT,
        "data_profile": "built-in defaults; no user JSON",
        "files": {str(p.relative_to(source)).replace("\\", "/"): hashlib.sha256(p.read_bytes()).hexdigest() for p in files},
    }
