// what src/db.js does today. this is the seam a real database would go
// behind, so its behaviour is worth pinning down before anyone moves it.
var test = require("node:test");
var assert = require("node:assert");
var db = require("../src/db");
var util = require("../src/util");

// the store is two module-level variables shared by every test in this file
// and there is no clear(). empty it through its own remove() instead, which
// is the only way in from outside. nextId keeps climbing; no test may assume
// an item's id is 1.
function reset() {
  var items = db.all().slice();
  for (var i = 0; i < items.length; i++) {
    db.remove(items[i].id);
  }
}

test.beforeEach(reset);

test("all is empty when nothing has been added", function () {
  assert.deepStrictEqual(db.all(), []);
});

test("add returns the item it stored", function () {
  var it = db.add("Widget", 3, 1250);
  assert.strictEqual(it.name, "Widget");
  assert.strictEqual(it.qty, 3);
  assert.strictEqual(it.price, 1250);
  assert.strictEqual(typeof it.id, "number");
  assert.strictEqual(typeof it.created, "string");
});

test("add stamps created with a readable date", function () {
  var it = db.add("Widget", 1, 1);
  assert.ok(!isNaN(Date.parse(it.created)), "created should parse as a date: " + it.created);
});

test("add appends to all, in the order they arrived", function () {
  db.add("Widget", 3, 1250);
  db.add("Gasket", 12, 499);
  var items = db.all();
  assert.strictEqual(items.length, 2);
  assert.strictEqual(items[0].name, "Widget");
  assert.strictEqual(items[1].name, "Gasket");
});

test("all hands back the very item add returned", function () {
  var it = db.add("Widget", 3, 1250);
  assert.strictEqual(db.all()[0], it);
});

test("add gives every item its own id", function () {
  var a = db.add("Widget", 1, 100);
  var b = db.add("Gasket", 1, 100);
  assert.notStrictEqual(a.id, b.id);
  assert.strictEqual(b.id, a.id + 1);
});

// ids come from a counter, not from the list length, so a hole left by a
// delete is never filled in again
test("add does not reuse the id of a removed item", function () {
  var a = db.add("Widget", 1, 100);
  db.remove(a.id);
  var b = db.add("Gasket", 1, 100);
  assert.notStrictEqual(b.id, a.id);
});

test("find returns the item with that id", function () {
  db.add("Widget", 3, 1250);
  var it = db.add("Gasket", 12, 499);
  assert.strictEqual(db.find(it.id), it);
});

// ids arrive from req.query.id as strings and are stored as numbers. the
// loose == in find is what bridges that, and /delete depends on it.
test("find matches a string id against a numeric one", function () {
  var it = db.add("Widget", 3, 1250);
  assert.strictEqual(db.find(String(it.id)), it);
});

test("find returns null when nothing matches", function () {
  db.add("Widget", 3, 1250);
  assert.strictEqual(db.find(999999), null);
  assert.strictEqual(db.find("nope"), null);
});

test("find returns null on an empty store", function () {
  assert.strictEqual(db.find(1), null);
});

test("remove drops only the item named", function () {
  db.add("Widget", 3, 1250);
  var gasket = db.add("Gasket", 12, 499);
  db.add("Flange", 1, 19999);
  db.remove(gasket.id);
  var items = db.all();
  assert.strictEqual(items.length, 2);
  assert.strictEqual(items[0].name, "Widget");
  assert.strictEqual(items[1].name, "Flange");
  assert.strictEqual(db.find(gasket.id), null);
});

// the other half of the loose comparison, and the one /delete actually uses
test("remove accepts a string id", function () {
  var it = db.add("Widget", 3, 1250);
  db.remove(String(it.id));
  assert.deepStrictEqual(db.all(), []);
});

test("remove of an unknown id leaves the list alone", function () {
  db.add("Widget", 3, 1250);
  db.remove(999999);
  assert.strictEqual(db.all().length, 1);
});

test("remove of the last item empties the store", function () {
  var it = db.add("Widget", 3, 1250);
  db.remove(it.id);
  assert.deepStrictEqual(db.all(), []);
});

test("a removed item takes its value out of the total", function () {
  db.add("Widget", 3, 1250);
  var flange = db.add("Flange", 1, 19999);
  assert.strictEqual(util.total(db.all()), 23749);
  db.remove(flange.id);
  assert.strictEqual(util.total(db.all()), 3750);
});
