# Versioning & Releases

kk-date uses [semantic versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`) and publishes to npm as [`kk-date`](https://www.npmjs.com/package/kk-date).

Releases are **developer-driven**: you bump the version in your PR. On merge to `main`, CI publishes to npm, tags `vX.Y.Z`, and creates the GitHub Release. You never run `npm publish` by hand, and nothing is published from `dev`.

## Bump the version

Pick one and run it on your PR branch:

```bash
npm version patch --no-git-tag-version   # bug fix          4.2.0 -> 4.2.1
npm version minor --no-git-tag-version   # new feature      4.2.0 -> 4.3.0
npm version major --no-git-tag-version   # breaking change  4.2.0 -> 5.0.0
```

Then commit and push, and merge the PR to `main`:

```bash
git commit -am "chore: bump version" && git push
```

> The version-reminder bot comments the exact command and the resulting version on every PR — copy it from there.
> Docs / tests / CI / internal refactors need no bump; the reminder never blocks the merge.

## Custom release notes

Add a `## Release Notes` section to the **PR description**; everything under it becomes the GitHub Release body. Omit it to auto-generate notes from PR titles.

## Release checklist (`dev` → `main`)

1. If you pushed JavaScript changes to `dev`, wait for its **Update Benchmark Docs** run to finish:
   it commits refreshed numbers back to `dev`. Don't open the release PR before that.
2. Bring `dev` up to date with `main` (`git merge origin/main`; `main` only accepts an up-to-date
   branch), bump the version, turn the CHANGELOG heading into the new version, commit and push.
   The PR's head must be a commit pushed by a person: commits pushed by the benchmark bot never
   trigger the PR checks, so a PR whose head is the bot's commit waits forever for
   `All checks passed`.
3. Open the PR `dev` → `main` and add a `## Release Notes` section to its description.
4. When `All checks passed` is green, a code owner other than the last pusher approves (an approval
   given before your last push is dismissed); then merge.
5. `publish.yml` runs the tests again, publishes to npm (trusted publishing with provenance — the
   npm configuration is bound to the file name `publish.yml`, don't rename it), tags `vX.Y.Z` and
   creates the GitHub Release. Check with `npm view kk-date version`.
6. Merge `main` back into `dev`.
