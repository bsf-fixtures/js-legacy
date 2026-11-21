<!--
  The conventions no check enforces. Everything here is something a script
  could not decide, which is why it is prose.

  The bar for a line in this file: it has to be a judgement. If a static rule
  could catch it, it belongs in .factory/guardrails/ instead, because a rule
  is reproducible and prose is something agents argue with.

  Each line carries where it came from, so a line nobody can justify can be
  removed later.
-->

# Fundamentals — js-legacy

A note on what this file can and cannot claim. There is one commit, no app
issues and no app pull requests, so nothing here is mined from a review
someone actually gave. Every line below is read off the code itself or off
the comments the authors left in it, and the Source column says which. Where
the codebase is consistent, that consistency is the convention; where it
contradicts itself, the row says so rather than picking a winner.

## Dominant patterns

For each recurring concern, the pattern most of this codebase already uses.
Follow it rather than introducing a second way of doing the same thing.

| Concern | The pattern here | Source |
| --- | --- | --- |
| Module boundary | CommonJS. `var x = require("./x")` at the top, one `module.exports = { name: name, ... }` object literal as the last line. No default exports, no `exports.foo =`, no ESM. | `src/db.js:35`, `src/handlers.js:77`, `src/report.js:31`, `src/util.js:38`; `src/server.js:23` is the one exception and exports the app object itself |
| Storing money | Integer cents, everywhere, all the way through. `price` is cents in `db.add`, cents in the item, cents in `util.total`. The division by 100 happens only at the moment of display. Never introduce a float price. | `src/db.js:10`, `src/util.js:3-13`, `src/handlers.js:35-36` |
| HTTP handlers | A plain named `function (req, res)`, exported by name and wired to its URL in `src/server.js`. No router objects, no `express.Router()`, no middleware beyond the one `express.urlencoded`, no `next`. | `src/server.js:6-13`, `src/handlers.js`, `src/report.js:20` |
| Producing a page | A `var html = "..."` built up by concatenation inside the handler and handed to `res.send`. No template engine, no partials, no layout. `handlers.index` uses `html = html + ...`; `report.render` uses `html += ...` — same pattern, two spellings. | `src/handlers.js:7-30`, `src/report.js:22-27` |
| Iteration | Indexed `for (var i = 0; i < xs.length; i++)` with `xs[i]`. Not one `map`, `filter`, `forEach` or `reduce` appears in the repo, including where one would read better — `db.remove` is a hand-written filter. | `src/db.js:17,27`, `src/handlers.js:11,65`, `src/report.js:8`, `src/util.js:9` |
| Declarations | `var`, without exception. No `let` and no `const` anywhere in `src/`: the `no-var` baseline is 32 across all five files, and nothing else. | All five files; `npm run lint` after setup |
| Reaching the data | Through `src/db.js`'s four functions. Nothing outside that file names `items` or `nextId`, and no handler keeps its own copy of anything. | `src/db.js:35`, callers in `handlers.js` and `report.js` |
| Rejecting bad input | Check, `res.status(400).send("plain string")`, bare `return`. No thrown errors, no error middleware, no JSON error body, and no status codes other than 200, 302 and 400. | `src/handlers.js:37-40`, `src/handlers.js:53-56` |
| After a mutation | `res.redirect("/")`. Post/redirect/get; no page is rendered in response to a POST. | `src/handlers.js:48,58` |
| Escaping for HTML | `util.esc` is called at the interpolation point, not at storage time and not in a wrapper. | `src/handlers.js:14`, `src/util.js:20-29` |
| Naming | Short lowercase: `db`, `it`, `t`, `qty`, `fmt`, `esc`, `n`, `s`. Functions are verbs or nouns of one word; nothing is camelCased beyond `nextId` and `exportCsv`. | All five files |
| Configuration | Read `process.env` once, at the point of use, with an inline `||` default. There is no config module and no `.env` loader, and only one variable (`PORT`) exists. | `src/server.js:15` |
| Comments | Lowercase, conversational, and used to admit a problem rather than to explain the code: "was going to move this to a real db but never did", "TODO: split this file up", "third copy of this logic". | `src/db.js:1`, `src/handlers.js:4,61`, `src/report.js:3,15`, `src/util.js:1,15` |

## Product intent

A single-user stock list that one person runs and looks at. That shapes
several decisions an agent would otherwise get wrong:

- **It is a server-rendered HTML app, not an API.** Every route returns a
  page or a redirect, except `/export` (CSV) and `/health` (the string `ok`).
  A new feature should return HTML built the way the existing pages are
  built. Adding a JSON endpoint, or a client-side framework, is a change of
  kind, not an increment — it needs asking about first.
- **Prices are cents and quantities are whole units.** The form field is
  literally labelled "price in cents" and `handlers.add` runs both through
  `parseInt(..., 10)`. Anything about currency, rounding or tax has to keep
  the integer-cents invariant.
- **The value of a line is `qty × price`, not `price`.** Both totallers agree
  on that, and it was confirmed against the running app: adding qty 5 at 275
  cents moved the total by $13.75. It is the one piece of domain arithmetic
  here and both copies of it must stay in step.
- **Being lenient with input is deliberate.** A bad qty becomes 1 and a bad
  price becomes 0 rather than a 400; only a missing name is refused. This is
  a tool for one person typing quickly, so do not turn the coercions into
  validation errors without being asked.
- **Nothing is expected to survive a restart.** The data lives in the
  process. That is a known shortcut, not a design goal — `src/db.js`'s first
  line says a real database was intended — but no current behaviour may
  assume durability.

Beyond the README there is no product documentation, no spec and no issue
history, so anything not listed above is not known, and is worth asking about
rather than inferring.

## Taste

Things a reviewer would ask for that no rule states.

- **Do not add a fourth money formatter.** There are already three
  implementations of `(n / 100).toFixed(2)`: `util.money`, `util.money2` (the
  same without the `$`) and `report.fmt`. When you need to format money,
  import `util.money`. When you fix one of them, fix all of them — the README
  names this trio as the clearest duplication in the repo.
- **Likewise for totalling.** `util.total` and `report.totals` both compute
  `Σ qty × price`. `report.totals` additionally returns `units` and `lines`,
  which is why it exists; it should still get the value from `util.total`
  rather than looping again.
- **Escape everything you interpolate, not just the name.** `handlers.index`
  calls `util.esc` on `items[i].name` (line 14) and on nothing else. The
  other fields happen to be numbers today, which is luck rather than a
  reason. New interpolation of anything a user supplied goes through
  `util.esc`.
- **A handler that needs a comment saying what it is doing is too long.**
  `handlers.index` is 27 lines of concatenation under a `// TODO: split this
  file up`. Do not add to it; extract the piece you need.
- **Keep `src/db.js` the only thing that knows how items are stored.** It is
  the seam a real database would be introduced behind, and it is currently
  intact. A handler that reaches past it costs more later than the loop it
  saves now.
- **Match the file you are editing.** `var` and indexed `for` loops are wrong
  by any modern standard and are also what every line here looks like. A
  change that modernises three lines in the middle of a `var` file makes the
  file harder to read, not easier, and it also moves a rule's per-file
  baseline, which the static gate has to account for. Modernise a whole file
  in a gardening PR, or leave the style alone in a feature PR — not half of
  each.
- **No new dependency without a reason that survives being said out loud.**
  One runtime dependency is a feature of this repo. Three copies of a money
  formatter is not an argument for a currency library.

## Deliberate exceptions

Places that look like they break a rule and should stay as they are, with the
reason. Without this section, cleanup keeps rediscovering them.

| Place | Why it stays | Source |
| --- | --- | --- |
| `src/server.js:17-21` — the `if (require.main === module)` guard around `app.listen`, and `module.exports = app` on line 23 with no importer in the repo | This is the only testing seam in the codebase: it is what lets a future test `require("./src/server")` and drive the app without binding a port. The repo has no tests yet, so both look like dead code; removing them would be the first thing to undo when tests arrive. | `src/server.js:17-23`, read against the repo having no test file |
| `eslint.config.mjs` holding rules that the code violates 36 times | By design. Setup turns each rule on and the static gate records a per-file baseline; gardening then lowers it in small verified PRs. A pull request that turns rules **off** to go green, or that autofixes all five files at once, defeats the ratchet. | `eslint.config.mjs:1-9` (the file's own comment), `.factory/guardrails/baselines.json` |
| The browser's 404 for `/favicon.ico` on every page load | The app serves no static files at all, by design. It is the only console error the app produces; a verifier that treats console errors as failures should expect this one. | Observed in Chromium against the running app during setup |
| `util.pad`, exported and called from nowhere | Flagged here because it will keep being rediscovered: unlike the rows above, there is **no** justification for it in the repo, and nothing was found that explains why it exists. Treat it as removable, not as a deliberate exception — this row exists to record that the question was asked and the answer was not found. | `src/util.js:31-36`; the only other mention of the name anywhere in `src/` is the export on line 38 |

The duplication (three money formatters, two totallers) and the defects the
README lists under "Known problems, not yet fixed" are explicitly **not**
exceptions. They are known and unfixed, which is different from intended.
They are recorded in `history.md`.
