"""Maintain the file manifest embedded in check.ps1.

check.ps1 is what a machine without git runs after hand-copying files from GitHub: it hashes every
file it expects in its folder and names each one that is missing or not the current version, with a
download URL. The list it checks against is embedded in the script itself, so downloading check.ps1
is downloading the current list. This tool writes that list from the git index, i.e. from exactly
what the next commit will contain.

    python3 scripts/check_manifest.py build          # rewrite the manifest in check.ps1
    python3 scripts/check_manifest.py verify         # exit 1 if check.ps1 is out of date
    python3 scripts/check_manifest.py install-hook   # rebuild and stage it on every commit

Hashes are SHA-256 of the file with CRLF turned into LF (text files only, git's NUL-byte test), so a
copy that went through an editor on Windows still counts as current. check.ps1 computes the same.
"""
import hashlib
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHECK_PS1 = ROOT / "check.ps1"
HOOK = ROOT / ".git" / "hooks" / "pre-commit"

BEGIN = "# BEGIN MANIFEST"
END = "# END MANIFEST"
BLOCK = re.compile(rf"^{re.escape(BEGIN)}.*?^{re.escape(END)}[^\n]*$", re.M | re.S)

HOOK_TEXT = """#!/bin/sh
# Installed by scripts/check_manifest.py install-hook: keeps the manifest in check.ps1
# in step with every commit.
python3 scripts/check_manifest.py build || exit 1
git add check.ps1
"""


def content_hash(data: bytes) -> str:
    if b"\0" not in data[:8000]:
        data = data.replace(b"\r\n", b"\n")
    return hashlib.sha256(data).hexdigest()


def included(path: str) -> bool:
    # check.ps1 cannot carry its own hash; dotfiles (.gitignore, .gitkeep) are of no use on a copy.
    return path != "check.ps1" and not Path(path).name.startswith(".")


def index_blobs() -> dict[str, bytes]:
    """path -> content of every regular file in the git index."""
    listing = subprocess.run(["git", "ls-files", "-s", "-z"], cwd=ROOT, capture_output=True, check=True).stdout
    entries = []
    for record in filter(None, listing.split(b"\0")):
        meta, path = record.split(b"\t", 1)
        mode, sha, _stage = meta.split()
        if mode in (b"100644", b"100755"):
            entries.append((path.decode("utf-8"), sha))
    batch = subprocess.run(["git", "cat-file", "--batch"], cwd=ROOT, check=True, capture_output=True,
                           input=b"".join(sha + b"\n" for _, sha in entries)).stdout
    blobs, pos = {}, 0
    for path, _sha in entries:
        header_end = batch.index(b"\n", pos)
        size = int(batch[pos:header_end].split()[2])
        blobs[path] = batch[header_end + 1:header_end + 1 + size]
        pos = header_end + 1 + size + 1
    return blobs


def manifest_lines(blobs: dict[str, bytes]) -> list[str]:
    return [f"{content_hash(data)}  {path}" for path, data in sorted(blobs.items()) if included(path)]


def render_block(lines: list[str]) -> str:
    body = "\n".join(lines)
    version = hashlib.sha256(body.encode("utf-8")).hexdigest()[:12]
    return (f"{BEGIN} - written by scripts/check_manifest.py from the git index, never edit by hand\n"
            f'$manifestVersion = "{version}"\n'
            f"$manifestText = @'\n{body}\n'@\n"
            f"{END}")


def expected_script() -> str:
    text = CHECK_PS1.read_text(encoding="utf-8")
    if len(BLOCK.findall(text)) != 1:
        sys.exit(f"check.ps1: expected exactly one '{BEGIN}' ... '{END}' block")
    block = render_block(manifest_lines(index_blobs()))
    return BLOCK.sub(lambda _: block, text)


def main() -> int:
    command = sys.argv[1] if len(sys.argv) > 1 else ""
    if command == "build":
        new = expected_script()
        if new != CHECK_PS1.read_text(encoding="utf-8"):
            CHECK_PS1.write_text(new, encoding="utf-8", newline="\n")
            print("check.ps1: manifest updated")
        return 0
    if command == "verify":
        if expected_script() != CHECK_PS1.read_text(encoding="utf-8"):
            print("check.ps1: manifest is out of date - run: python3 scripts/check_manifest.py build")
            return 1
        print("check.ps1: manifest current")
        return 0
    if command == "install-hook":
        if HOOK.exists() and HOOK.read_text() != HOOK_TEXT:
            sys.exit(f"{HOOK} exists with other content - merge the two by hand:\n\n{HOOK_TEXT}")
        HOOK.write_text(HOOK_TEXT)
        HOOK.chmod(0o755)
        print(f"installed {HOOK.relative_to(ROOT)}")
        return 0
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main())
