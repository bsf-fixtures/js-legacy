var test = require("node:test");
var assert = require("node:assert");

var db = require("../src/db");
var util = require("../src/util");
var report = require("../src/report");

// the store is two module-level variables in src/db.js and every test in this
// process shares them, so each test starts by emptying it through db.remove
function clear() {
  var items = db.all();
  var ids = [];
  for (var i = 0; i < items.length; i++) {
    ids.push(items[i].id);
  }
  for (var j = 0; j < ids.length; j++) {
    db.remove(ids[j]);
  }
}

// collects what render() hands to res.send
function fakeRes() {
  return {
    body: null,
    send: function (html) {
      this.body = html;
    }
  };
}

test.beforeEach(clear);
test.after(clear);

test("totals of an empty store is all zeroes", function () {
  assert.deepStrictEqual(report.totals(), { value: 0, units: 0, lines: 0 });
});

test("totals counts one line per item and sums qty, not value", function () {
  db.add("Widget", 3, 1250);
  db.add("Gasket", 12, 499);

  var t = report.totals();

  assert.strictEqual(t.lines, 2);
  assert.strictEqual(t.units, 15);
});

test("the value of a line is qty times price, in cents", function () {
  db.add("Widget", 3, 1250);

  assert.strictEqual(report.totals().value, 3750);
});

test("totals agrees with util.total on the same items", function () {
  db.add("Widget", 3, 1250);
  db.add("Gasket", 12, 499);
  db.add("Flange", 1, 19999);

  assert.strictEqual(report.totals().value, util.total(db.all()));
});

test("render sends the report page with lines, units and value", function () {
  db.add("Widget", 3, 1250);
  db.add("Gasket", 12, 499);
  db.add("Flange", 1, 19999);

  var res = fakeRes();
  report.render({}, res);

  assert.match(res.body, /<h1>Report<\/h1>/);
  assert.match(res.body, /<p>lines: 3<\/p>/);
  assert.match(res.body, /<p>units: 16<\/p>/);
  assert.match(res.body, /<p>value: \$297\.37<\/p>/);
});

test("render links back to the stock page", function () {
  var res = fakeRes();
  report.render({}, res);

  assert.match(res.body, /<a href="\/">back<\/a>/);
});

test("render formats an empty store as $0.00", function () {
  var res = fakeRes();
  report.render({}, res);

  assert.match(res.body, /<p>lines: 0<\/p>/);
  assert.match(res.body, /<p>units: 0<\/p>/);
  assert.match(res.body, /<p>value: \$0\.00<\/p>/);
});
