// tests for the in-memory store in src/db.js.
// the store is two module-level variables, so each test takes a fresh copy of
// the module rather than trying to undo what the test before it did.
var test = require("node:test");
var assert = require("node:assert");

function freshDb() {
  delete require.cache[require.resolve("../src/db")];
  return require("../src/db");
}

test("a fresh store is empty", function () {
  var db = freshDb();
  assert.deepStrictEqual(db.all(), []);
});

test("add returns the item it stored, with id 1 on a fresh store", function () {
  var db = freshDb();
  var it = db.add("Bolt", 5, 275);
  assert.strictEqual(it.id, 1);
  assert.strictEqual(it.name, "Bolt");
  assert.strictEqual(it.qty, 5);
  assert.strictEqual(it.price, 275);
  assert.strictEqual(typeof it.created, "string");
});

test("add appends to the list in the order it was called", function () {
  var db = freshDb();
  db.add("Widget", 3, 1250);
  db.add("Gasket", 12, 499);
  var items = db.all();
  assert.strictEqual(items.length, 2);
  assert.strictEqual(items[0].name, "Widget");
  assert.strictEqual(items[1].name, "Gasket");
});

test("add gives each item the next id", function () {
  var db = freshDb();
  var first = db.add("Widget", 3, 1250);
  var second = db.add("Gasket", 12, 499);
  assert.strictEqual(second.id, first.id + 1);
});

test("an id is never reused after its item is removed", function () {
  var db = freshDb();
  var first = db.add("Widget", 3, 1250);
  db.remove(first.id);
  var second = db.add("Gasket", 12, 499);
  assert.strictEqual(second.id, first.id + 1);
});

test("find returns the item with that id", function () {
  var db = freshDb();
  db.add("Widget", 3, 1250);
  var gasket = db.add("Gasket", 12, 499);
  assert.strictEqual(db.find(gasket.id), gasket);
});

test("find matches a string id, which is what /delete relies on", function () {
  var db = freshDb();
  var it = db.add("Widget", 3, 1250);
  assert.strictEqual(db.find(String(it.id)), it);
});

test("find returns null when no item has that id", function () {
  var db = freshDb();
  db.add("Widget", 3, 1250);
  assert.strictEqual(db.find(99), null);
});

test("find on an empty store returns null", function () {
  var db = freshDb();
  assert.strictEqual(db.find(1), null);
});

test("remove drops that item and keeps the others", function () {
  var db = freshDb();
  var widget = db.add("Widget", 3, 1250);
  var gasket = db.add("Gasket", 12, 499);
  db.remove(widget.id);
  var items = db.all();
  assert.strictEqual(items.length, 1);
  assert.strictEqual(items[0], gasket);
  assert.strictEqual(db.find(widget.id), null);
});

test("remove matches a string id, which is what /delete relies on", function () {
  var db = freshDb();
  var it = db.add("Widget", 3, 1250);
  db.remove(String(it.id));
  assert.deepStrictEqual(db.all(), []);
});

test("remove with an unknown id leaves the list alone", function () {
  var db = freshDb();
  db.add("Widget", 3, 1250);
  db.remove(99);
  assert.strictEqual(db.all().length, 1);
});

test("all reflects what the store holds now, after add and remove", function () {
  var db = freshDb();
  var widget = db.add("Widget", 3, 1250);
  db.add("Gasket", 12, 499);
  db.remove(widget.id);
  db.add("Flange", 1, 19999);
  var names = [];
  var items = db.all();
  for (var i = 0; i < items.length; i++) {
    names.push(items[i].name);
  }
  assert.deepStrictEqual(names, ["Gasket", "Flange"]);
});
