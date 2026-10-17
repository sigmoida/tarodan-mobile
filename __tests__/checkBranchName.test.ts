/**
 * scripts/check-branch-name.sh (husky pre-push). Names are enforced only where they
 * are chosen: a new remote branch, or a push into development/master. Updates to an
 * existing remote branch, tags and deletions always pass.
 */
import { spawnSync } from "child_process";
import path from "path";

const SCRIPT = path.resolve(__dirname, "../scripts/check-branch-name.sh");
const ZERO = "0".repeat(40);
const SHA_A = "a".repeat(40);
const SHA_B = "b".repeat(40);

function run(args: string[], input = "") {
  return spawnSync("sh", [SCRIPT, ...args], { input, encoding: "utf8" }).status;
}
const line = (
  local: string,
  localSha: string,
  remote: string,
  remoteSha: string,
) => `${local} ${localSha} ${remote} ${remoteSha}\n`;

describe("check-branch-name.sh <name>", () => {
  it.each([
    "development",
    "master",
    "worktree-agent-acc0621d",
    "docs/claude-structure",
    "fix/offer-counter-lock",
    "hotfix/guest-card-403",
    "integration/wave-4",
  ])("accepts %s", (name) => {
    expect(run([name])).toBe(0);
  });

  it.each([
    "feature/foo",
    "nav/rails-to-search",
    "fix/Offer",
    "fix/offer_lock",
    "fix/",
    "main",
    "dependabot/npm/x",
  ])("rejects %s", (name) => {
    expect(run([name])).toBe(1);
  });
});

describe("check-branch-name.sh as a pre-push hook (stdin)", () => {
  it("rejects creating a badly named remote branch", () => {
    expect(
      run([], line("refs/heads/nav/x", SHA_A, "refs/heads/nav/x", ZERO)),
    ).toBe(1);
  });

  it("accepts creating a well-named remote branch", () => {
    expect(
      run([], line("refs/heads/fix/a-b", SHA_A, "refs/heads/fix/a-b", ZERO)),
    ).toBe(0);
  });

  it("lets updates to an existing remote branch through (e.g. dependabot/*)", () => {
    expect(
      run(
        [],
        line(
          "refs/heads/dependabot/npm/x",
          SHA_A,
          "refs/heads/dependabot/npm/x",
          SHA_B,
        ),
      ),
    ).toBe(0);
  });

  it("rejects pushing a stray local branch into development", () => {
    expect(
      run([], line("refs/heads/nav/x", SHA_A, "refs/heads/development", SHA_B)),
    ).toBe(1);
  });

  it("accepts pushing development and hotfix branches into their targets", () => {
    expect(
      run(
        [],
        line("refs/heads/development", SHA_A, "refs/heads/development", SHA_B),
      ),
    ).toBe(0);
    expect(
      run([], line("refs/heads/hotfix/x", SHA_A, "refs/heads/master", SHA_B)),
    ).toBe(0);
  });

  it("ignores tags and deletions", () => {
    expect(run([], line("refs/tags/v1", SHA_A, "refs/tags/v1", ZERO))).toBe(0);
    expect(run([], line("(delete)", ZERO, "refs/heads/nav/x", SHA_B))).toBe(0);
  });

  it("fails when any of several refs is bad", () => {
    const input =
      line("refs/heads/feat/ok", SHA_A, "refs/heads/feat/ok", ZERO) +
      line("refs/heads/Bad", SHA_A, "refs/heads/Bad", ZERO);
    expect(run([], input)).toBe(1);
  });
});
