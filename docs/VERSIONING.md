# Versioning & Releases

kk-date follows [semantic versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`) and is published to npm as [`kk-date`](https://www.npmjs.com/package/kk-date).

Releases are **developer-driven**: you bump the version inside your pull request. When the PR is merged to `main`, CI publishes to npm, creates the git tag, and drafts the GitHub Release automatically. Nothing is published from `dev`, and you never run `npm publish` by hand.

## TL;DR — how to release

1. On your PR branch, bump the version — pick one:

   ```bash
   npm version patch --no-git-tag-version   # bug fix          4.2.0 -> 4.2.1
   npm version minor --no-git-tag-version   # new feature      4.2.0 -> 4.3.0
   npm version major --no-git-tag-version   # breaking change  4.2.0 -> 5.0.0
   ```

2. Commit and push:

   ```bash
   git commit -am "chore: bump version"
   git push
   ```

3. (Optional) Add a `## Release Notes` section to the PR description for custom release notes.
4. Merge the PR to `main`. CI does the rest: **npm publish + `vX.Y.Z` tag + GitHub Release.**

The reminder comment on your PR shows the exact command and resulting version, ready to copy.

## Which bump do I pick?

| Change | Bump | Example |
| --- | --- | --- |
| Bug fix, no API change | `patch` | 4.2.0 → 4.2.1 |
| New feature, backward compatible | `minor` | 4.2.0 → 4.3.0 |
| Breaking change | `major` | 4.2.0 → 5.0.0 |

When in doubt: `minor` for additions, `major` only when existing usage could break.

## The flow

```
PR (bump package.json)
  ├─ version-reminder  → comments the preview / reminds you to bump
  └─ pr-checks         → lint + tests
        │
   merge to main
        │
   publish.yml (push: main) → npm publish  +  git tag vX.Y.Z  +  GitHub Release
```

- `--no-git-tag-version` changes `package.json` only (no local tag or commit) — CI creates the authoritative tag on `main`.
- Bumps are allowed on PRs to `dev` or `main`, but the actual publish happens only when the version reaches `main`.
- Publishing is idempotent: `publish.yml` only publishes when `main`'s version is not already on npm, so ordinary pushes to `main` do nothing.

## Custom release notes

By default the GitHub Release notes are generated from merged PR titles. To write your own, add a section to your **PR description**:

```markdown
## Release Notes

- Fixed a DST edge case in `format('YYYY-MM-DD')`
- Added `isBetween` support for `weeks`
```

Everything under that heading becomes the release body. Omit it to fall back to the auto-generated notes.

## FAQ

**I bumped by mistake.** Undo it in the PR before merging — set the old version back and push:

```bash
npm version <old-version> --no-git-tag-version --allow-same-version
git commit -am "chore: revert version bump"
git push
```

**A PR without a version bump — is that a problem?** No. Docs, tests, CI, and internal refactors merge normally without a bump. The reminder is only a nudge; it never blocks your merge.

**The bot didn't publish.** `publish.yml` skips when `main`'s `package.json` version is already on npm. If the version was already released, that is expected.

**Prerelease / beta versions?** Not set up yet — every release goes to the npm `latest` tag. Open an issue if you need a `next`/`beta` channel.
