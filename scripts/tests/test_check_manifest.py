"""check.ps1's embedded manifest matches the repository, and hashes the way check.ps1 does.

    python3 -m unittest scripts/tests/test_check_manifest.py

The pre-commit hook (python3 scripts/check_manifest.py install-hook) keeps the manifest current;
this catches a commit made where the hook is not installed. The PowerShell test runs only where
pwsh is on PATH.
"""
import importlib.util
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("check_manifest", ROOT / "scripts" / "check_manifest.py")
check_manifest = importlib.util.module_from_spec(spec)
spec.loader.exec_module(check_manifest)


class ManifestTest(unittest.TestCase):
    def test_manifest_is_current(self):
        if not (ROOT / ".git").exists():
            self.skipTest("needs a git checkout")
        result = subprocess.run([sys.executable, "scripts/check_manifest.py", "verify"], cwd=ROOT,
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout)

    def test_crlf_counts_as_lf_in_text_only(self):
        h = check_manifest.content_hash
        self.assertEqual(h(b"a\r\nb\r\n"), h(b"a\nb\n"))
        self.assertNotEqual(h(b"\0a\r\nb"), h(b"\0a\nb"))
        self.assertEqual(h(b""), check_manifest.hashlib.sha256(b"").hexdigest())

    def test_powershell_agrees(self):
        pwsh = shutil.which("pwsh")
        if not pwsh:
            self.skipTest("pwsh not on PATH")
        with tempfile.TemporaryDirectory() as tmp:
            subprocess.run(["git", "checkout-index", "-a", f"--prefix={tmp}/"], cwd=ROOT, check=True)
            run = lambda: subprocess.run([pwsh, "-NoProfile", "-File", f"{tmp}/check.ps1"],
                                         capture_output=True, text=True)
            clean = run()
            self.assertEqual(clean.returncode, 0, clean.stdout)
            readme = Path(tmp, "README.md")
            readme.write_bytes(readme.read_bytes().replace(b"\n", b"\r\n"))
            self.assertEqual(run().returncode, 0, "CRLF copy must count as current")
            readme.write_text("old")
            stale = run()
            self.assertEqual(stale.returncode, 1)
            self.assertIn("OUTDATED README.md", stale.stdout)


if __name__ == "__main__":
    unittest.main()
