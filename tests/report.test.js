var test = require("node:test");
var assert = require("node:assert");
var db = require("../src/db");
var util = require("../src/util");
var report = require("../src/report");
var helpers = require("./helpers");

test.beforeEach(function () {
  helpers.reset();
});

test("totals of an empty store is all zeroes", function () {
  assert.deepStrictEqual(report.totals(), { value: 0, units: 0, lines: 0 });
});

test("totals counts lines, sums units and values qty times price", function () {
  db.add("Widget", 3, 1250);
  db.add("Gasket", 12, 499);
  db.add("Flange", 1, 19999);
  assert.deepStrictEqual(report.totals(), {
    value: 3 * 1250 + 12 * 499 + 1 * 19999,
    units: 16,
    lines: 3,
  });
});

test("totals.value agrees with util.total", function () {
  // two implementations of one sum. they have to stay in step.
  db.add("Widget", 3, 1250);
  db.add("Gasket", 12, 499);
  assert.strictEqual(report.totals().value, util.total(db.all()));
});

test("GET /report shows lines, units and value", async function () {
  var h = await helpers.start();
  try {
    db.add("Widget", 3, 1250);
    db.add("Gasket", 12, 499);
    db.add("Flange", 1, 19999);
    var res = await helpers.get(h.url + "/report");
    assert.strictEqual(res.status, 200);
    var body = await res.text();
    assert.match(body, /<h1>Report<\/h1>/);
    assert.match(body, /lines: 3/);
    assert.match(body, /units: 16/);
    assert.match(body, /value: \$297\.37/);
    assert.match(body, /<a href="\/">back<\/a>/);
  } finally {
    await helpers.stop(h);
  }
});

test("GET /report on an empty store reads zero", async function () {
  var h = await helpers.start();
  try {
    var res = await helpers.get(h.url + "/report");
    var body = await res.text();
    assert.match(body, /lines: 0/);
    assert.match(body, /units: 0/);
    assert.match(body, /value: \$0\.00/);
  } finally {
    await helpers.stop(h);
  }
});
