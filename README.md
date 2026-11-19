# js-legacy

Build Software Factory fixture: a small stock-tracking app written the way
real old code gets written. No tests, no types, no formatter, `var`
everywhere, three copies of the money formatter, HTML built by string
concatenation.

It is here so setup has to take the hard paths: **no tests at all**, and
enough lint violations that rules go in behind large per-file baselines which
gardening then clears.

## Run

```bash
npm install
npm start          # http://localhost:3000
```

## Test

There are none. That is the point.

## Verify by hand

1. Open `/`. Add an item with a name, a quantity and a price in cents.
2. It appears in the table with the price formatted as dollars, and the total
   updates.
3. `/report` shows lines, units and value.
4. `/export` downloads `stock.csv`.
5. `/health` returns `ok`.

## What this fixture exercises

- **The no-tests path.** Setup cannot measure coverage, so the floor starts at
  0% and gardening is seeded to add tests per feature folder, most-changed
  first. Diff coverage still applies from the first PR.
- **Large baselines.** Every rule the language pack turns on has violations
  here. They go in with a per-file baseline, and gardening clears them in
  small verified PRs, each lowering its rule's count and raising no count in
  any file.

  Measured against a stand-in for the JavaScript rule pack, this is what setup
  has to baseline — **90 violations across 8 rules and all five files**:

  | Rule | Violations | Spread |
  | --- | --- | --- |
  | `no-var` | 32 | all 5 files |
  | `prefer-template` | 29 | 4 files |
  | `object-shorthand` | 19 | 4 files |
  | `no-param-reassign` | 4 | `util.js` |
  | `eqeqeq` | 3 | `db.js`, `util.js` |
  | `max-lines-per-function` | 1 | `handlers.js` |
  | `prefer-arrow-callback` | 1 | `server.js` |
  | `no-console` | 1 | `server.js` |

  The spread matters as much as the count: because baselines are per file, a
  gardening PR that fixes a violation in one file and introduces one in
  another must fail the ratchet, and that needs several files holding the same
  rule to test against.
- **Real duplication to find.** `util.money`, `util.money2` and `report.fmt`
  are three versions of one thing; `util.total` and `report.totals` are two.
  A gardener looking for principle drift should find these.

## Known problems, not yet fixed

- `db.find` and `db.remove` compare ids with `==`, so `"3"` and `3` both match.
  That was convenient and is now load-bearing somewhere, probably.
- `handlers.exportCsv` does not quote CSV fields, so a name with a comma
  breaks the file.
- `handlers.index` interpolates into HTML by hand. `util.esc` is applied to
  the name and to nothing else.
