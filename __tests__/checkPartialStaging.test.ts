/**
 * scripts/check-partial-staging.sh (husky pre-commit). lint-staged runs with
 * --no-stash, so a file with both staged and unstaged changes must be refused.
 */
import { execFileSync, spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const SCRIPT = path.resolve(__dirname, "../scripts/check-partial-staging.sh");

function repo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "partial-staging-"));
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: dir, stdio: "pipe" });
  git("init", "-q");
  git("config", "user.email", "test@example.com");
  git("config", "user.name", "test");
  git("config", "core.hooksPath", "/dev/null");
  fs.writeFileSync(path.join(dir, "a.txt"), "one\n");
  fs.mkdirSync(path.join(dir, "app (tabs)"));
  fs.writeFileSync(path.join(dir, "app (tabs)", "b.txt"), "one\n");
  git("add", ".");
  git("commit", "-q", "-m", "init");
  return { dir, git };
}
const run = (cwd: string) => spawnSync("sh", [SCRIPT], { cwd, encoding: "utf8" });

describe("check-partial-staging.sh", () => {
  it("passes when nothing is staged", () => {
    const { dir } = repo();
    fs.writeFileSync(path.join(dir, "a.txt"), "two\n");
    expect(run(dir).status).toBe(0);
  });

  it("passes when whole files are staged", () => {
    const { dir, git } = repo();
    fs.writeFileSync(path.join(dir, "a.txt"), "two\n");
    git("add", "a.txt");
    expect(run(dir).status).toBe(0);
  });

  it("passes when a different file has unstaged changes", () => {
    const { dir, git } = repo();
    fs.writeFileSync(path.join(dir, "a.txt"), "two\n");
    git("add", "a.txt");
    fs.writeFileSync(path.join(dir, "app (tabs)", "b.txt"), "two\n");
    expect(run(dir).status).toBe(0);
  });

  it("fails and names the file when it is partially staged", () => {
    const { dir, git } = repo();
    fs.writeFileSync(path.join(dir, "app (tabs)", "b.txt"), "two\n");
    git("add", ".");
    fs.writeFileSync(path.join(dir, "app (tabs)", "b.txt"), "three\n");
    const r = run(dir);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("app (tabs)/b.txt");
    expect(r.stderr).toContain("Stage the whole file");
  });
});
