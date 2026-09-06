"""Exercise deployment failure/recovery without touching Docker or a real DB."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).with_name("deploy-release.sh").resolve()
SHA = "a" * 40
RELEASE = SHA + "-1-1"
DOCKER = '''#!/usr/bin/env python3
import json, os, pathlib, sys
root = pathlib.Path(os.environ["FABRISCOPE_ROOT"])
args = sys.argv[1:]
failure = os.environ.get("DEPLOY_TEST_FAILURE", "")
with (root / "calls.jsonl").open("a") as output:
    output.write(json.dumps(args) + "\\n")
if args[0] == "inspect":
    print("sha256:previous")
elif args[0] == "compose":
    if "build" in args and failure == "build": sys.exit(9)
    if "pg_dump" in args:
        if failure == "backup": sys.exit(9)
        print("ISOLATED_TEST_BACKUP")
    if "pg_restore" in args:
        assert "--list" in args
        print("BACKUP_TABLE_OF_CONTENTS")
    if "migrate" in args and failure == "migration": sys.exit(9)
    if "up" in args:
        previous = "/previous/" in args[args.index("-f") + 1]
        (root / "active").write_text("previous" if previous else "candidate")
        if not previous and failure == "health": sys.exit(9)
'''
CURL = '''#!/usr/bin/env python3
import json, os, sys
if os.environ.get("DEPLOY_TEST_FAILURE") == "https": sys.exit(22)
print(json.dumps({"commit": os.environ["DEPLOY_TEST_SHA"], "status": "ok"}))
'''


class DeploymentTest(unittest.TestCase):
    def run_release(self, failure):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve()
            candidate = root / "releases" / RELEASE
            previous = root / "releases" / "previous"
            candidate.mkdir(parents=True)
            previous.mkdir()
            (root / "current").symlink_to(previous, target_is_directory=True)
            (root / "active").write_text("previous")
            (root / ".env").write_text("SITE_HOST=deployment-test.invalid\n")
            binary = root / "bin"
            binary.mkdir()
            for name, source in {"docker": DOCKER, "curl": CURL,
                                 "sudo": '#!/bin/sh\nexec "$@"\n'}.items():
                path = binary / name
                path.write_text(source)
                path.chmod(0o700)
            environment = dict(os.environ, FABRISCOPE_ROOT=str(root),
                               DEPLOY_TEST_FAILURE=failure, DEPLOY_TEST_SHA=SHA,
                               PATH=str(binary) + os.pathsep + os.environ["PATH"])
            result = subprocess.run(["bash", str(SCRIPT), RELEASE, SHA],
                                    cwd=candidate, env=environment,
                                    capture_output=True, text=True, timeout=20)
            self.assertEqual(result.returncode == 0, not failure,
                             result.stdout + result.stderr)
            self.assertEqual((root / "current").resolve(), previous if failure else candidate)
            self.assertEqual((root / "active").read_text(), "previous" if failure else "candidate")
            calls = [json.loads(line) for line in (root / "calls.jsonl").read_text().splitlines()]
            self.assertFalse(any("seed" in args for args in calls))
            self.assertFalse(any("pg_restore" in args and "--list" not in args for args in calls))
            if failure in ("migration", "health", "https") or not failure:
                self.assertTrue((root / "backups" / ("before-" + RELEASE + ".dump")).is_file())
            if not failure:
                self.assertEqual(json.loads((root / "deployment.json").read_text())["commit"], SHA)

    def test_only_verified_release_becomes_current(self):
        self.run_release("")

    def test_failed_build_preserves_running_application(self):
        self.run_release("build")

    def test_failed_backup_preserves_running_application(self):
        self.run_release("backup")

    def test_failed_migration_preserves_running_application(self):
        self.run_release("migration")

    def test_failed_container_health_restores_previous_application(self):
        self.run_release("health")

    def test_failed_public_https_restores_previous_application(self):
        self.run_release("https")


if __name__ == "__main__":
    unittest.main()
