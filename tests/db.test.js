var test = require("node:test");
var beforeEach = test.beforeEach;
var assert = require("node:assert");
var db = require("../src/db");
var helpers = require("./helpers");

beforeEach(function () {
  helpers.reset();
});

test("all starts empty and lists what was added, in order", function () {
  assert.deepStrictEqual(db.all(), []);
  db.add("Widget", 3, 1250);
  db.add("Gasket", 12, 499);
  var items = db.all();
  assert.strictEqual(items.length, 2);
  assert.strictEqual(items[0].name, "Widget");
  assert.strictEqual(items[1].name, "Gasket");
});

test("add returns the stored item with its id and fields", function () {
  var it = db.add("Widget", 3, 1250);
  assert.strictEqual(it.name, "Widget");
  assert.strictEqual(it.qty, 3);
  assert.strictEqual(it.price, 1250);
  assert.strictEqual(typeof it.id, "number");
  assert.strictEqual(typeof it.created, "string");
  assert.strictEqual(db.all()[0], it);
});

test("ids are allocated one at a time and are not reused after a remove", function () {
  var a = db.add("a", 1, 1);
  var b = db.add("b", 1, 1);
  assert.strictEqual(b.id, a.id + 1);
  db.remove(b.id);
  var c = db.add("c", 1, 1);
  assert.strictEqual(c.id, b.id + 1);
});

test("find returns the item for a numeric id", function () {
  var it = db.add("Widget", 3, 1250);
  assert.strictEqual(db.find(it.id), it);
});

// ids arrive from req.query.id as strings and are stored as numbers, so the
// loose comparison in db.find is what makes /delete work at all.
test("find matches a string id against a numeric one", function () {
  var it = db.add("Widget", 3, 1250);
  assert.strictEqual(db.find(String(it.id)), it);
});

test("find returns null when nothing matches", function () {
  db.add("Widget", 3, 1250);
  assert.strictEqual(db.find(9999), null);
  assert.strictEqual(db.find("9999"), null);
});

test("find on an empty store returns null", function () {
  assert.strictEqual(db.find(1), null);
});

test("remove drops only the named item and keeps the order of the rest", function () {
  var a = db.add("a", 1, 1);
  var b = db.add("b", 1, 1);
  var c = db.add("c", 1, 1);
  db.remove(b.id);
  var items = db.all();
  assert.strictEqual(items.length, 2);
  assert.strictEqual(items[0], a);
  assert.strictEqual(items[1], c);
  assert.strictEqual(db.find(b.id), null);
});

test("remove accepts a string id, as /delete supplies it", function () {
  var it = db.add("Widget", 3, 1250);
  db.remove(String(it.id));
  assert.deepStrictEqual(db.all(), []);
});

test("remove of an unknown id leaves the store alone", function () {
  db.add("Widget", 3, 1250);
  db.remove(9999);
  assert.strictEqual(db.all().length, 1);
});
