const test = require("node:test");
const assert = require("node:assert");
const db = require("../src/db");
const util = require("../src/util");
const report = require("../src/report");
const helpers = require("./helpers");

test.beforeEach(helpers.clearDb);

test("totals on an empty store is all zeroes", function () {
  assert.deepStrictEqual(report.totals(), { value: 0, units: 0, lines: 0 });
});

test("totals counts lines, sums units and values qty times price", function () {
  db.add("Widget", 3, 1250);
  db.add("Gasket", 12, 499);
  db.add("Flange", 1, 19999);
  assert.deepStrictEqual(report.totals(), { value: 29737, units: 16, lines: 3 });
});

test("report.totals and util.total agree on value", function () {
  db.add("Widget", 3, 1250);
  db.add("Gasket", 12, 499);
  db.add("Flange", 1, 19999);
  // The one piece of domain arithmetic in this app has two implementations.
  // This pins them together, so a fix to one that misses the other fails here.
  assert.strictEqual(report.totals().value, util.total(db.all()));
});
