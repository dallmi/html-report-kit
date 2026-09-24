#!/usr/bin/env python3
"""Maintain the redesign skill: its script lives only inside skills/redesign/SKILL.md.

    python3 scripts/redesign_skill_tool.py extract [--out FILE]   # appendix script -> FILE (to edit or run)
    python3 scripts/redesign_skill_tool.py embed FILE             # FILE -> appendix, then sync redesign.txt
    python3 scripts/redesign_skill_tool.py test                   # run scripts/tests against the embedded script
    python3 scripts/redesign_skill_tool.py verify [--forbid NAME]  # txt copy, instruction length, script compiles, NAME absent

Edit cycle: extract -> edit the .py -> embed -> test -> verify. Never edit redesign.txt by hand.
"""
import argparse
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKILL = ROOT / "skills" / "redesign" / "SKILL.md"
TXT = SKILL.with_name("redesign.txt")
INSTRUCTIONS = SKILL.with_name("agent-instructions.txt")
MAX_INSTRUCTIONS = 8000
BLOCK = re.compile(r"(## Appendix — `dash_redesign\.py`.*?```python\n)(.*?)(\n```\s*)$", re.S)


def script_text():
    m = BLOCK.search(SKILL.read_text(encoding="utf-8"))
    if not m:
        raise SystemExit("no appendix block '## Appendix — `dash_redesign.py`' with a ```python fence in %s" % SKILL)
    return m.group(2) + "\n"


def extract(out):
    Path(out).write_text(script_text(), encoding="utf-8")
    print("Wrote %s" % out)


def embed(src):
    code = Path(src).read_text(encoding="utf-8").rstrip("\n")
    if "```" in code:
        raise SystemExit("the script contains ``` and would break the Markdown fence")
    text = SKILL.read_text(encoding="utf-8")
    m = BLOCK.search(text)
    if not m:
        raise SystemExit("no appendix block in %s" % SKILL)
    SKILL.write_text(text[:m.start(2)] + code + text[m.end(2):], encoding="utf-8")
    sync()
    print("Embedded %s into %s and synced %s" % (src, SKILL.name, TXT.name))


def sync():
    TXT.write_bytes(SKILL.read_bytes())


def test():
    with tempfile.TemporaryDirectory() as tmp:
        py = Path(tmp) / "dash_redesign.py"
        py.write_text(script_text(), encoding="utf-8")
        env = dict(os.environ, REDESIGN_SCRIPT=str(py))
        return subprocess.run([sys.executable, "-m", "unittest", "-v", "scripts/tests/test_redesign.py"], cwd=ROOT, env=env).returncode


def verify(forbid=()):
    problems = []
    if not TXT.exists() or TXT.read_bytes() != SKILL.read_bytes():
        problems.append("%s differs from %s — run: embed or sync" % (TXT.name, SKILL.name))
    n = len(INSTRUCTIONS.read_text(encoding="utf-8")) if INSTRUCTIONS.exists() else None
    if n is None:
        problems.append("%s is missing" % INSTRUCTIONS.name)
    elif n > MAX_INSTRUCTIONS:
        problems.append("%s has %d characters (limit %d)" % (INSTRUCTIONS.name, n, MAX_INSTRUCTIONS))
    try:
        compile(script_text(), "dash_redesign.py", "exec")
    except SyntaxError as e:
        problems.append("appendix script does not compile: %s" % e)
    for name in forbid:
        for p in SKILL.parent.iterdir():
            if p.is_file() and re.search(r"\b%s\b" % re.escape(name), p.read_text(encoding="utf-8", errors="ignore"), re.I):
                problems.append("%s contains '%s'" % (p.name, name))
    print("SKILL.md %d chars · redesign.txt %s · agent-instructions.txt %s chars" %
          (len(SKILL.read_text(encoding="utf-8")), "identical" if TXT.exists() and TXT.read_bytes() == SKILL.read_bytes() else "DIFFERENT", n))
    for p in problems:
        print("PROBLEM " + p)
    print("verify: %s" % ("ok" if not problems else "FAILED"))
    return 1 if problems else 0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    e = sub.add_parser("extract")
    e.add_argument("--out", default="dash_redesign.py")
    m = sub.add_parser("embed")
    m.add_argument("src")
    sub.add_parser("sync")
    sub.add_parser("test")
    v = sub.add_parser("verify")
    v.add_argument("--forbid", action="append", default=[], help="a name that must not appear in the skill files")
    a = ap.parse_args()
    if a.cmd == "extract":
        extract(a.out)
    elif a.cmd == "embed":
        embed(a.src)
    elif a.cmd == "sync":
        sync()
    elif a.cmd == "test":
        return test()
    elif a.cmd == "verify":
        return verify(a.forbid)
    return 0


if __name__ == "__main__":
    sys.exit(main())
