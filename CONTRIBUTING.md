# Contributing to node-zpl

First off, thank you for considering contributing to `node-zpl`.

## Where do I go from here?

If you've noticed a bug or have a feature request, create an issue! It's generally best if you get confirmation of your bug or approval for your feature request this way before starting to code.

## Fork & create a branch

If this is something you think you can fix, then fork `node-zpl` and create a branch with a descriptive name.

A good branch name would be (where issue #1337 is the ticket you're working on):

```bash
git checkout -b 1337-add-postnet-bar-code
```

## Get the test suite running

Make sure you're testing your changes. `node-zpl` uses `vitest` for testing.

## Implement your fix or feature

At this point, you're ready to make your changes!

## Make a Pull Request

If you've gotten this far, you should make sure that your local main branch is up to date with `node-zpl`s main branch:

```bash
git remote add upstream git@github.com:ludwig-f/node-zpl
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
