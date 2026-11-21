<!--
  How to build, run, test and verify this app. Written by setup's phase 2,
  with every command tested rather than copied from a README.

  This is the most load-bearing context file: a verifier agent that cannot
  start the app cannot verify anything, and then the factory produces
  confident unverified PRs.
-->

# Runbook — js-legacy

## Build

```bash
npm ci
```

There is no build step. The app is plain CommonJS run straight by node — no
bundler, no transpiler, no type checker, no generated file, and no `build`
script in `package.json`. `npm ci` is the whole of it, and `commands.build`
in the manifest is `null` for that reason.

`npm ci` rather than `npm install`: it installs exactly what the committed
`package-lock.json` pins and fails if the lock file and `package.json`
disagree, so a round cannot quietly resolve a different dependency tree.
Measured here: exit 0, the 159 packages the lock file pins, 0 vulnerabilities.

It needs the network, and that is its only external dependency:
`registry.npmjs.org` is in the manifest's `egress` list. Running it with the
environment stripped to `PATH`, `HOME`, `TMPDIR`, `LANG`, `CI` and `PORT`
fails with `EAI_AGAIN`, because stripping the environment also strips this
runner's proxy configuration — not because the install wants anything of a
developer's own.

`npm run lint` (`eslint src`) also works once the install has run, but it is
deliberately **not** part of the build. Linting belongs to the static gate,
which runs the repo's own linter and compares each rule's per-file count
against `.factory/guardrails/baselines.json`. Running it in the build would
turn a baselined violation into a build failure — and with the rules setup
installed it reports 36 violations on untouched code, so the build would
fail every time.

## Run

```bash
node src/server.js
```

Equivalent to `npm start`, which runs the same file. The sandbox uses the
direct form so nothing sits between a stop signal and the server process.

The app is then at http://127.0.0.1:3000/.

It is a single foreground node process. It listens immediately — the log line
`listening on 3000` is the only startup output — and it holds all of its data
in its own memory, so stopping it discards everything that was added.

## Test

```bash
# none
```

**This repo has no tests.** No test framework, no test file, no `test` script
in `package.json`, and no CI workflow that runs any — every workflow under
`.github/workflows/` belongs to the factory, not to the app. The manifest
records `commands.test` as `null`, which says "this repo has none", not
"setup did not find out".

What follows from that:

- The tests gate has nothing of the repo's own to run.
- Total coverage sits at the floor in `.factory/guardrails/coverage.json`,
  which is `0`.
- Diff coverage (`diff_min_pct: 80`) still applies from the first pull
  request. So the first change to `src/` has to bring its own tests *and* the
  runner that executes them.
- Adding that runner is an ordinary `package.json` change. `npm ci` picks it
  up with no amendment to the sandbox; whoever adds it should also set
  `commands.test` through an amendment so the gate stops being blind.

Until then, verification here means the Verify section below: start the app
and look at it.

## Verify

How to see for yourself that the app works, as a developer would. Every step
below was run against the app during setup; the expected results are what it
actually returned, not what the README predicts.

1. `npm ci`, then `node src/server.js`. It prints `listening on 3000`.
2. `curl -s http://127.0.0.1:3000/health` → `ok`, status 200.
3. Open http://127.0.0.1:3000/ in a browser. You get the heading **Stock**, a
   bordered table with the header row `id name qty price`, an empty body on a
   fresh start, `total: $0.00`, a three-field add form and an *export csv*
   link. The browser console shows one 404 for `/favicon.ico` — the app
   serves no static files, so that error is expected and is not a regression.
4. Fill in name `Bolt`, qty `5`, price in cents `275`, and click **add**. The
   page redirects back to `/` with a new row — on a fresh start
   `1 | Bolt | 5 | $2.75` — and the total up by `$13.75`, which is qty ×
   price, not price. Ids start at 1 on every start, because `nextId` resets
   with the process.
5. `curl -s http://127.0.0.1:3000/report` → `lines`, `units` and `value`.
   `lines` counts rows, `units` sums qty, `value` is the same total as on `/`.
6. `curl -s -D- http://127.0.0.1:3000/export` → a CSV body beginning
   `id,name,qty,price`, with `Content-Type: text/csv; charset=utf-8` (the
   handler sets `text/csv`; express appends the charset) and
   `Content-Disposition: attachment; filename="stock.csv"`. Prices here have
   no dollar sign — `util.money2`, not `util.money`.
7. Click a row's **delete** link, or
   `curl -s -o /dev/null -w '%{http_code}' 'http://127.0.0.1:3000/delete?id=2'`
   → 302, and the row and its value are gone from both `/` and `/report`.

Three cases worth checking whenever handler input parsing or HTML building
changes, all three verified here:

- `POST /add` with no name → 400 `name required`.
- `POST /add` with qty `abc` and price `xyz` → 302, and a row reading qty `1`,
  price `$0.00`. The coercion is deliberate, not a bug.
- A name of `<b>Bolt</b> & "M6"` comes back from `/` as
  `&lt;b&gt;Bolt&lt;/b&gt; &amp; "M6"` and renders as literal text — `util.esc`
  handles `&`, `<` and `>` and **not** quotes — and comes back from `/export`
  raw and unquoted.

## Seed data

```bash
for r in "Widget:3:1250" "Gasket:12:499" "Flange:1:19999"; do IFS=: read -r n q p <<< "$r"; curl -fsS -o /dev/null -X POST --data-urlencode "name=$n" --data-urlencode "qty=$q" --data-urlencode "price=$p" "http://127.0.0.1:${PORT:-3000}/add"; done
```

**Run this after the app is listening, not before.** There is no database and
no fixture file — the only way to put data in is to POST it to the running
process, and the only way to take it out is to stop the process. Nothing on
disk changes.

It adds three items. `/report` then shows `lines: 3`, `units: 16`,
`value: $297.37`, which is a quick way to confirm both totallers
(`util.total` and `report.totals`) still agree.

The trial does not run this; it screenshots the empty state, which is the
app's real first screen.

## Commands that change persistent state

These are kept out of the build path on purpose. Each one writes to something
that outlives the process, so running it against the wrong target is the kind
of mistake that cannot be undone by reverting a commit.

| Command | Writes to | Only when |
| --- | --- | --- |
| *(none)* | — | — |

There are none. This app writes nothing that outlives its own process: no
database, no migration, no file write, no cache, no outbound call. The only
command that touches the filesystem is `npm ci`, and all it writes is
`node_modules/`, which is gitignored and rebuilt from the lock file. The seed
command above writes only into the running process's memory.

## Services this app needs

| Service | How it starts | Reached at |
| --- | --- | --- |
| *(none)* | — | — |

No database, cache, queue, object store or mail catcher. The entire store is
two module-level variables in `src/db.js`. `express` is the single runtime
dependency, and nothing in `src/` makes an outbound network call, so there is
also no third party to stub.

## The sandbox's environment

Built from this list, and from nothing else. It does not inherit a
developer's environment and it does not read any `.env` file, because a
documented build command that runs a migration would otherwise migrate
whatever a developer's credentials happen to point at.

| Variable | Value in the sandbox |
| --- | --- |
| `PORT` | `3000` |

That is the complete list. A search of `src/` for `process.env`, config-file
reads and settings modules returns exactly one hit: `src/server.js:15`,
`var port = process.env.PORT || 3000`. There is no API key, no connection
string, no base URL and no feature flag anywhere in this codebase, so there
is nothing here that could reach something real.

`PORT` is set explicitly rather than left to the `|| 3000` default so that
this file, `app_url` in the manifest and the port the process actually binds
cannot drift apart.

Alongside it the runner supplies the usual `PATH`, `HOME`, `TMPDIR`, `LANG`,
`CI` and `RUNNER_TEMP`, plus whatever proxy configuration it needs for the
egress hosts the manifest declares. `npm ci` is the only command here that
uses the network.
