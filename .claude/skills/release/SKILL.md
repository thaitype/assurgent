---
name: release
description: Release a new version to npm and create a GitHub release. Invoke with `/release patch`, `/release minor`, or `/release major`. Runs pre-release checks, bumps version via release-it, publishes to npm, creates git tag, then creates a GitHub release with AI-generated notes.
---

# Release

## Arguments

Exactly one of: `patch`, `minor`, `major`.

## Workflow

### 1. Validate argument

Extract bump type from arguments. Abort if not one of `patch`, `minor`, `major`.

### 2. Pre-release checks

Run all checks. Abort on any failure:

```bash
bun run typecheck
bun test
bun run lint
```

### 3. Determine previous version

Capture the current version before bumping:

```bash
git describe --tags --abbrev=0
```

### 4. Run release-it

```bash
bun run release:<bump_type>
```

This handles: version bump in package.json, npm publish, git commit, git tag, git push.

### 5. Get new version

Read the new version from `package.json` after release-it completes. The tag is `v<version>`.

### 6. Generate release notes

Get commit log between previous tag and new tag:

```bash
git log <previous_tag>..v<new_version> --oneline
```

Write an AI summary of the changes, grouped by category:

```markdown
## What's New
- bullet points for new features

## Fixes
- bullet points for bug fixes

## Other
- bullet points for chores, refactors, docs
```

Omit empty categories. Keep bullets concise (one line each).

### 7. Confirm with user

Show the drafted release notes to the user and ask for confirmation before creating the GitHub release. Allow edits if requested.

### 8. Create GitHub release

```bash
gh release create v<new_version> --title "v<new_version>" --notes "<release_notes>"
```
