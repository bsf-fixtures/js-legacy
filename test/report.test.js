var test = require("node:test");
var assert = require("node:assert");
var db = require("../src/db");
var util = require("../src/util");
var report = require("../src/report");

// the store is a module-level array, so each test clears it first
function clear() {
  var ids = [];
  var items = db.all();
  for (var i = 0; i < items.length; i++) {
    ids.push(items[i].id);
  }
  for (var j = 0; j < ids.length; j++) {
    db.remove(ids[j]);
  }
}

function capture() {
  var sent = { body: null };
  report.render({}, { send: function (s) { sent.body = s; } });
  return sent.body;
}

test("totals is empty when the store is empty", function () {
  clear();
  assert.deepStrictEqual(report.totals(), { value: 0, units: 0, lines: 0 });
});

test("totals counts lines, sums units and agrees with util.total", function () {
  clear();
  db.add("Widget", 3, 1250);
  db.add("Gasket", 12, 499);
  db.add("Flange", 1, 19999);
  var t = report.totals();
  assert.strictEqual(t.lines, 3);
  assert.strictEqual(t.units, 16);
  assert.strictEqual(t.value, 29737);
  assert.strictEqual(t.value, util.total(db.all()));
});

test("render shows lines, units and the value formatted by util.money", function () {
  clear();
  db.add("Widget", 3, 1250);
  db.add("Gasket", 12, 499);
  db.add("Flange", 1, 19999);
  var html = capture();
  assert.ok(html.indexOf("<p>lines: 3</p>") !== -1, html);
  assert.ok(html.indexOf("<p>units: 16</p>") !== -1, html);
  assert.ok(html.indexOf("<p>value: " + util.money(29737) + "</p>") !== -1, html);
  assert.ok(html.indexOf("<p>value: $297.37</p>") !== -1, html);
});

test("render shows a zero value on an empty store", function () {
  clear();
  var html = capture();
  assert.ok(html.indexOf("<p>lines: 0</p>") !== -1, html);
  assert.ok(html.indexOf("<p>units: 0</p>") !== -1, html);
  assert.ok(html.indexOf("<p>value: $0.00</p>") !== -1, html);
});
