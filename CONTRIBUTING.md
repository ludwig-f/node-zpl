# Contributing to zplkit

First off, thank you for considering contributing to `zplkit`.

## Where do I go from here?

If you've noticed a bug or have a feature request, create an issue! It's generally best if you get confirmation of your bug or approval for your feature request this way before starting to code.

## Fork & create a branch

If this is something you think you can fix, then fork `zplkit` and create a branch with a descriptive name.

A good branch name would be (where issue #1337 is the ticket you're working on):

```bash
git checkout -b 1337-add-postnet-bar-code
```

## Get the test suite running

Make sure you're testing your changes. The repository is a [pnpm](https://pnpm.io) workspace with one package per folder in `packages/`, tested with `vitest`:

```bash
pnpm install
pnpm test    # all packages
pnpm lint
pnpm build
```

## Implement your fix or feature

At this point, you're ready to make your changes!

## Make a Pull Request

If you've gotten this far, you should make sure that your local main branch is up to date with `zplkit`s main branch:

```bash
git remote add upstream git@github.com:ludwig-f/zplkit
git switch main
git pull upstream main
```

Then update your feature branch from your local copy of main and push it!

```bash
git switch 1337-add-postnet-bar-code
git rebase main
git push -u origin 1337-add-postnet-bad-code
```

Finally got to GitHub and [make a Pull Request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request) 🚀

## Keep your Pull Request updated

If a maintainer asks you to "rebase" your PR, they're saying that a lot of code has changed and that you need to update your branch so it's easier to merge.

To learn more about rebasing in Git, there are a lot of good resources but here's the suggested workflow:

```bash
git switch 1337-add-postnet-bar-code
git pull --rebase upstream main
git push --force-with-lease 1337-add-postnet-bar-code
```

## Merging a PR (maintainers only)

A PR can only be merged into main by a maintainer if:

- It is passing CI.
- It has been approved by at least one maintainer.
- It has no request changes.
- It is up to date with current main.

Any maintainer is allowed to merge a PR if all of these conditions are met.

## Releasing a new package

Packages that aren't ready to publish are marked `"private": true` in their `package.json` and left out of `release-please-config.json`. To release one, remove `"private"`, add the package to `release-please-config.json` (with `"initial-version"` for its first version) and add it to `.release-please-manifest.json` at `"0.0.0"`.

