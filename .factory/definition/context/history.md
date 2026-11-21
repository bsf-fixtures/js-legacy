<!--
  What has gone wrong before, and what was learned. Seeded by setup from the
  mined corrections, then added to by the scheduled review.

  This file is for failures whose lesson could not be turned into a check. A
  correction that became a rule does not belong here: the rule is the record,
  and repeating it in prose means two things to keep in step.
-->

# History — js-legacy

**There is no correction history to mine.** The repo has one commit
(`6667865`), no app issues, and three pull requests — #1, #2 and #3 — all of
which install or upgrade the factory and none of which touch `src/`. There
is no CI history for the app, no revert, no incident and no review comment
anywhere. So nothing below is a failure this project has lived through.

What the repo does record about itself is a set of defects its authors
already know about, written down in `README.md` under "Known problems, not
yet fixed" and in comments in the code. Those are in the first table. They
are listed as lessons because each one has a clear "what to do instead", but
the source column should be read literally: this is the repo describing
itself, not a post-mortem. When one of them is fixed, it moves to the second
table.

## Lessons

| What happened | What to do instead | Where it came from |
| --- | --- | --- |
| `db.find` and `db.remove` compare ids with `==` and `!=`, so the string `"3"` and the number `3` both match. Ids arrive as strings from `req.query.id` and are stored as numbers, so the loose comparison is what makes `/delete` work at all. The README's own note is that this "was convenient and is now load-bearing somewhere, probably". | Do not tighten the comparison to `===` on its own — that silently breaks `/delete`, and nothing would catch it, because there are no tests. Convert at the boundary first: parse `req.query.id` in `handlers.del`, then make the comparison strict, then check `/delete` by hand against the Verify steps in the runbook. The two changes belong in one pull request. | `README.md`, "Known problems, not yet fixed"; `src/db.js:18,28`; `src/handlers.js:52` |
| `handlers.exportCsv` builds each CSV row by joining fields with commas and quoting nothing. An item named `Bolt, M6` produces a row with five fields instead of four, and any spreadsheet reads the file wrongly from that line on. | Quote and escape the field when writing it — wrap in `"` and double any embedded `"` — rather than rejecting commas in names at the input. Names are free text on purpose. Fix the header row's assumptions at the same time, and check with the Verify step for `/export`. | `README.md`, "Known problems, not yet fixed"; `src/handlers.js:62-71` |
| `handlers.index` interpolates straight into HTML and applies `util.esc` to the name only. The other fields are numbers today, so there is no live injection, but the escaping is positional rather than systematic: the next field added to that table will be unescaped unless someone remembers. | Escape at every interpolation of anything a user supplied, not at the ones that currently look risky. Better, extract the row-building so there is one place that decides. Note that `util.esc` handles `&`, `<` and `>` and not quotes, so it is not safe for an attribute value — the `href="/delete?id=..."` on line 17 is only safe because the id is a number. | `README.md`, "Known problems, not yet fixed"; `src/handlers.js:5-31`; `src/util.js:20-29` |
| Three implementations of one money formatter (`util.money`, `util.money2`, `report.fmt`) and two of one totaller (`util.total`, `report.totals`) drifted into existence, each written because the author did not find the one already there. The code comments say so directly: "second way of totalling things, written before util.total existed", "third copy of this logic". | Import the existing one. Before adding a helper, search `src/util.js` — it is small enough to read in full. When fixing a formatting bug, fix every copy in the same change; a repo with three copies and no tests will otherwise ship a half-fix. | `src/report.js:3,15`; `src/util.js:1,15`; `README.md`, "What this fixture exercises" |
| `src/db.js` was written as a placeholder — "was going to move this to a real db but never did" — and the whole app now depends on its behaviour, including that ids start at 1 on every start and that nothing persists. | Treat `src/db.js` as the interface a real store would go behind, and keep all item access inside it. Do not let a handler cache items, hold an index, or assume an id is stable across a restart. | `src/db.js:1` |

## Problem classes already eliminated

Kept so nobody proposes a rule that exists, and so a regression is
recognisable as one.

| Problem class | How it was eliminated | When |
| --- | --- | --- |
| *(none)* | — | — |

Nothing has been eliminated yet, because no change has been made to this app
since it was written. `.factory/guardrails/baselines.json` is empty
(`"rules": {}`) and `.factory/guardrails/candidates.json` holds no
candidates, which is the same fact from the gate's side: no rule is being
ratcheted yet.

The first entries here will come from the baselines the static gate records
and gardening then clears. The README predicts what those will be — 90
violations across 8 rules and all five files, led by `no-var` (32) and
`prefer-template` (29) — but that is measured against a stand-in rule pack,
not against this repo's current `eslint.config.mjs`, which enables only
`no-undef` and reports zero violations today. Do not treat those numbers as
a baseline that exists; they are a prediction of what one will look like.

## Escalations

Work the factory could not finish, and why. A pattern across several of these
is a signal about the factory rather than about the work.

| Work item | Where it stopped | Cause |
| --- | --- | --- |
| *(none)* | — | — |

No work has run. One thing is worth writing down in advance, because it is
the most likely first escalation: this repo has no tests and no test runner,
while diff coverage is set to 80% from the first pull request. The first
change to `src/` therefore has to add a test runner as well as tests, and
then the sandbox manifest needs an amendment to set `commands.test`, which
is currently `null`. A builder that writes tests without a runner, or adds a
runner without amending the sandbox, will stall at the tests gate.
