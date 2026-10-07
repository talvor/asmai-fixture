# asmai-fixture

A small fixture repository for [talvor/asmai](https://github.com/talvor/asmai). Delivery cases (M1 onwards) open pull requests here. They need CI whose outcome can be switched between **green**, **red**, **slow** and **absent**.

The code is a hello-world Node.js module (`src/index.js`) with a test (`test/index.test.js`).

```sh
npm start          # Hello, world!
npm start -- you   # Hello, you!
npm test
```

## CI

`.github/workflows/ci.yml` runs on every pull request as a single check, `CI / test`. By default it runs the tests and passes.

## Switching CI

The switch is the `.ci-mode` file on the pull request's branch. Each PR controls its own outcome. Use the script, then commit and push:

```sh
scripts/ci-mode.sh green          # default: tests run, check passes
scripts/ci-mode.sh red            # tests run, then the check fails
scripts/ci-mode.sh slow 20        # check starts, sleeps 20 minutes, then passes
scripts/ci-mode.sh absent         # no check runs at all
git commit -am "ci: switch mode" && git push
```

| Mode     | `.ci-mode`        | Result on the PR                                                |
|----------|-------------------|-----------------------------------------------------------------|
| green    | `green`           | `CI / test` succeeds                                            |
| red      | `red`             | `CI / test` fails                                               |
| slow     | `slow <minutes>`  | `CI / test` stays in progress for `<minutes>` (any value up to the 120-minute job timeout, so past 15 minutes works), then succeeds |
| absent   | `absent`          | The workflow file is removed on the branch, so no check run is created |

For **absent**, the workflow file has to be removed. If the job were only skipped, a "skipped" check would still appear on the PR. Pull request workflows run from the PR's merge commit, so deleting the workflow on the branch means nothing triggers. Running `scripts/ci-mode.sh green` (or `red`/`slow`) restores the workflow from `origin/main`.

To stop CI for the whole repository instead of one PR, run `gh workflow disable CI`, and `gh workflow enable CI` to turn it back on.
