// covers src/report.js: its own totaller, its own money formatter and the
// page it renders.
var test = require("node:test");
var assert = require("node:assert");

// report.js holds its own reference to the store, so both modules are
// reloaded together.
function fresh() {
  delete require.cache[require.resolve("../src/db")];
  delete require.cache[require.resolve("../src/report")];
  var report = require("../src/report");
  return { report: report, db: require("../src/db") };
}

function res() {
  var r = {
    body: null,
    send: function (b) {
      r.body = b;
      return r;
    }
  };
  return r;
}

test("totals of an empty store is all zeroes", function () {
  var f = fresh();
  assert.deepStrictEqual(f.report.totals(), { value: 0, units: 0, lines: 0 });
});

test("totals counts lines, sums units and values at qty times price", function () {
  var f = fresh();
  f.db.add("Widget", 3, 1250);
  f.db.add("Gasket", 12, 499);
  f.db.add("Flange", 1, 19999);
  assert.deepStrictEqual(f.report.totals(), { value: 29737, units: 16, lines: 3 });
});

// The two totallers are separate implementations of one piece of domain
// arithmetic, so this pins them to the same answer.
test("report.totals agrees with util.total on value", function () {
  var f = fresh();
  var util = require("../src/util");
  f.db.add("Widget", 3, 1250);
  f.db.add("Gasket", 12, 499);
  assert.strictEqual(f.report.totals().value, util.total(f.db.all()));
});

test("render shows lines, units and value, with the value in dollars", function () {
  var f = fresh();
  f.db.add("Widget", 3, 1250);
  f.db.add("Gasket", 12, 499);
  f.db.add("Flange", 1, 19999);
  var r = res();
  f.report.render({}, r);
  assert.match(r.body, /<h1>Report<\/h1>/);
  assert.match(r.body, /<p>lines: 3<\/p>/);
  assert.match(r.body, /<p>units: 16<\/p>/);
  assert.match(r.body, /<p>value: \$297\.37<\/p>/);
  assert.match(r.body, /<a href="\/">back<\/a>/);
});

test("render on an empty store shows zeroes", function () {
  var f = fresh();
  var r = res();
  f.report.render({}, r);
  assert.match(r.body, /<p>lines: 0<\/p>/);
  assert.match(r.body, /<p>units: 0<\/p>/);
  assert.match(r.body, /<p>value: \$0\.00<\/p>/);
});
