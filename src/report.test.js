var test = require("node:test");
var assert = require("node:assert");
var db = require("./db");
var util = require("./util");
var report = require("./report");

// the store is module state, so each test starts from an empty one
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

function send() {
  var sent = { body: null };
  report.render({}, {
    send: function (body) {
      sent.body = body;
    }
  });
  return sent.body;
}

test("totals is all zeroes with nothing in stock", function () {
  clear();
  assert.deepStrictEqual(report.totals(), { value: 0, units: 0, lines: 0 });
});

test("totals counts lines, sums units and values each line as qty x price", function () {
  clear();
  db.add("Widget", 3, 1250);
  db.add("Gasket", 12, 499);
  var t = report.totals();
  assert.strictEqual(t.lines, 2);
  assert.strictEqual(t.units, 15);
  assert.strictEqual(t.value, 3 * 1250 + 12 * 499);
});

test("totals takes its value from util.total rather than counting again", function () {
  clear();
  db.add("Widget", 3, 1250);
  db.add("Flange", 1, 19999);
  assert.strictEqual(report.totals().value, util.total(db.all()));
});

test("render shows lines, units and the value in dollars", function () {
  clear();
  db.add("Widget", 3, 1250);
  var html = send();
  assert.ok(html.indexOf("<p>lines: 1</p>") !== -1, html);
  assert.ok(html.indexOf("<p>units: 3</p>") !== -1, html);
  assert.ok(html.indexOf("<p>value: $37.50</p>") !== -1, html);
  assert.ok(html.indexOf('<a href="/">back</a>') !== -1, html);
});

test("render formats money the way util.money does", function () {
  clear();
  db.add("Gasket", 12, 499);
  assert.ok(send().indexOf("value: " + util.money(report.totals().value)) !== -1);
});

test("render shows $0.00 with nothing in stock", function () {
  clear();
  var html = send();
  assert.ok(html.indexOf("<p>lines: 0</p>") !== -1, html);
  assert.ok(html.indexOf("<p>value: $0.00</p>") !== -1, html);
});
