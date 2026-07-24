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
