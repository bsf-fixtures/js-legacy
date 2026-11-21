var test = require("node:test");
var beforeEach = test.beforeEach;
var assert = require("node:assert");
var db = require("../src/db");
var util = require("../src/util");
var report = require("../src/report");
var helpers = require("./helpers");

beforeEach(function () {
  helpers.reset();
});

test("totals of an empty store is zero on all three counts", function () {
  assert.deepStrictEqual(report.totals(), { value: 0, units: 0, lines: 0 });
});

test("totals counts lines, sums units and values qty times price", function () {
  db.add("Widget", 3, 1250);
  db.add("Gasket", 12, 499);
  db.add("Flange", 1, 19999);
  assert.deepStrictEqual(report.totals(), { value: 29737, units: 16, lines: 3 });
});

test("totals counts a line even when its qty is zero", function () {
  db.add("Widget", 0, 1250);
  assert.deepStrictEqual(report.totals(), { value: 0, units: 0, lines: 1 });
});

// there are two totallers in this repo and this is the one piece of domain
// arithmetic in it, so they have to stay in step.
test("report.totals agrees with util.total on value", function () {
  db.add("Widget", 3, 1250);
  db.add("Gasket", 12, 499);
  db.add("Flange", 1, 19999);
  assert.strictEqual(report.totals().value, util.total(db.all()));
});

test("render shows lines, units and value, with the value as money", function () {
  db.add("Widget", 3, 1250);
  db.add("Gasket", 12, 499);
  db.add("Flange", 1, 19999);
  var res = helpers.fakeRes();
  report.render({}, res);
  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.body.indexOf("<h1>Report</h1>") !== -1);
  assert.ok(res.body.indexOf("<p>lines: 3</p>") !== -1);
  assert.ok(res.body.indexOf("<p>units: 16</p>") !== -1);
  assert.ok(res.body.indexOf("<p>value: $297.37</p>") !== -1);
});

// report.fmt is a third copy of util.money and is not exported, so the page is
// the only place the two can be compared.
test("render formats the value exactly as util.money would", function () {
  db.add("Widget", 3, 1250);
  var res = helpers.fakeRes();
  report.render({}, res);
  assert.ok(res.body.indexOf("<p>value: " + util.money(util.total(db.all())) + "</p>") !== -1);
});

test("render links back to the stock page", function () {
  var res = helpers.fakeRes();
  report.render({}, res);
  assert.ok(res.body.indexOf('<a href="/">back</a>') !== -1);
});
