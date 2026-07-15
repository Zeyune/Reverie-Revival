// Enables the repo's committed git hooks by pointing core.hooksPath at .githooks.
// Runs automatically via the "prepare" npm script on `npm install`.
// Cross-platform and fail-safe: if this isn't a git checkout (e.g. a tarball install),
// or git isn't available, it exits quietly without failing the install.
import { execSync } from "node:child_process";

try {
  execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore" });
  execSync("git config core.hooksPath .githooks");
  console.log("✓ Git hooks enabled (core.hooksPath = .githooks)");
} catch {
  // Not a git working tree, or git unavailable — nothing to enable.
}
