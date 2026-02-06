# Plan: Upgrade Packages with Vulnerabilities

## Current status (as of plan creation)

- **npm audit**: 0 vulnerabilities reported (info/low/moderate/high/critical).
- **Dependencies**: 35 prod + 520 dev + 49 optional + 1 peer (556 total in lockfile).

Even with a clean audit now, dependencies drift over time. Use this plan whenever you want to address vulnerabilities or do a safe dependency refresh.

---

## Phase 1: Assess

### 1.1 Run a fresh audit

```powershell
cd e:\GitHub\HorseShowEditor
npm audit
```

- If there are vulnerabilities, note severity (low / moderate / high / critical) and which packages are affected.
- Save a copy of the report (e.g. `npm audit --json > audit-report.json`) for reference.

### 1.2 Try automatic fixes (non-destructive)

```powershell
npm audit fix
```

- This only applies **semver-compatible** changes and does not change `package.json` ranges by default.
- Re-run `npm audit` after. Remaining issues usually need manual upgrades.

### 1.3 Optional: Fix including breaking changes (use with care)

```powershell
npm audit fix --force
```

- **Warning**: Can introduce breaking changes. Prefer manual upgrades (Phase 2) over `--force` unless you’re prepared to fix breakage.

---

## Phase 2: Manual upgrades for remaining vulnerabilities

If `npm audit fix` doesn’t clear everything:

1. **List vulnerable packages**  
   From `npm audit` output, note each package and the version that fixes the issue (often under “fix available” or in the advisory).

2. **Upgrade one dependency at a time** (recommended):
   - **Production**: `npm install <package>@latest` (or `@<fix-version>`).
   - **Dev**: `npm install -D <package>@latest` (or `@<fix-version>`).
   - Run tests and a quick manual check after each upgrade.

3. **Optional: bulk “latest” check**  
   To see what’s outdated (requires network):
   ```powershell
   npm outdated
   ```
   Then upgrade critical/vulnerable packages first, then others as needed.

---

## Phase 3: Harden the project

### 3.1 CI check (recommended)

Add an audit step so PRs/main don’t introduce known vulnerabilities:

- **Option A – fail on any vulnerability**  
  In your CI (e.g. GitHub Actions):
  ```yaml
  - run: npm audit --audit-level=moderate
  ```
  (Use `audit-level=high` or `critical` if you prefer.)

- **Option B – report only**  
  Run `npm audit` and publish the result as a job summary or artifact without failing the build.

### 3.2 Optional: lockfile and audit in pre-publish

In `package.json` you can add:

```json
"scripts": {
  "prepublishOnly": "npm audit --audit-level=high"
}
```

Only runs when someone runs `npm publish`; adjust or skip if you don’t publish to npm.

### 3.3 Keep dependencies up to date

- Re-run this plan periodically (e.g. monthly or after major ecosystem issues).
- After upgrading, run:
  ```powershell
  npm audit
  npm run build
  npm run test
  ```

---

## Phase 4: If a vulnerability has no fix yet

When an advisory has “No fix available”:

1. **Check the advisory** on [npm Advisory](https://www.npmjs.com/advisories) or the link in `npm audit` for workarounds or mitigation.
2. **Consider**:
   - Removing the dependency if unused.
   - Replacing it with a maintained alternative.
   - Accepting the risk temporarily and tracking the advisory until a fix is released.
3. **Document** the decision (e.g. in this file or in an ADR) and set a reminder to re-check.

---

## Quick reference: commands

| Goal                    | Command                          |
|-------------------------|----------------------------------|
| See vulnerabilities     | `npm audit`                      |
| Auto-fix (safe)         | `npm audit fix`                  |
| Auto-fix (risky)        | `npm audit fix --force`          |
| Upgrade one package     | `npm install <pkg>@latest`       |
| See outdated            | `npm outdated`                   |
| Full reinstall (clean)  | `Remove-Item node_modules; npm install` |

---

## Summary

1. **Assess**: `npm audit` → `npm audit fix` → re-audit.
2. **Manual**: Upgrade remaining vulnerable packages one by one; test after each.
3. **Harden**: Add `npm audit` to CI and optionally to prepublish.
4. **No fix**: Document and track; consider replace or remove.

Right now there are no reported vulnerabilities; use this plan when new ones appear or when you do a scheduled dependency refresh.
