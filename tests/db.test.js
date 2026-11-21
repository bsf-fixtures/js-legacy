var test = require("node:test");
var assert = require("node:assert");
var db = require("../src/db");
var helpers = require("./helpers");

test.beforeEach(function () {
  helpers.reset();
});

test("all starts empty and reflects what was added", function () {
  assert.deepStrictEqual(db.all(), []);
  db.add("Widget", 3, 1250);
  assert.strictEqual(db.all().length, 1);
});

test("add returns the stored item with the fields the app reads", function () {
  var it = db.add("Widget", 3, 1250);
  assert.strictEqual(it.name, "Widget");
  assert.strictEqual(it.qty, 3);
  assert.strictEqual(it.price, 1250);
  assert.strictEqual(typeof it.id, "number");
  assert.strictEqual(typeof it.created, "string");
  assert.strictEqual(db.all()[0], it);
});

test("add gives every item a new id", function () {
  var a = db.add("Widget", 1, 100);
  var b = db.add("Gasket", 1, 100);
  assert.notStrictEqual(a.id, b.id);
  assert.strictEqual(b.id, a.id + 1);
});

test("ids keep climbing after a remove, they are not reused", function () {
  var a = db.add("Widget", 1, 100);
  db.remove(a.id);
  var b = db.add("Gasket", 1, 100);
  assert.strictEqual(b.id, a.id + 1);
});

test("find returns the item for its id", function () {
  var a = db.add("Widget", 3, 1250);
  db.add("Gasket", 12, 499);
  assert.strictEqual(db.find(a.id), a);
});

test("find matches a numeric string id, which is how /delete reaches it", function () {
  // ids are stored as numbers and arrive from req.query as strings. the
  // loose == in db.find is what bridges the two.
  var a = db.add("Widget", 3, 1250);
  assert.strictEqual(db.find(String(a.id)), a);
});

test("find returns null when nothing matches", function () {
  db.add("Widget", 3, 1250);
  assert.strictEqual(db.find(999999), null);
});

test("remove drops only the item asked for", function () {
  var a = db.add("Widget", 3, 1250);
  var b = db.add("Gasket", 12, 499);
  db.remove(a.id);
  assert.deepStrictEqual(db.all(), [b]);
  assert.strictEqual(db.find(a.id), null);
});

test("remove accepts a numeric string id too", function () {
  var a = db.add("Widget", 3, 1250);
  db.remove(String(a.id));
  assert.deepStrictEqual(db.all(), []);
});

test("removing an id that is not there changes nothing", function () {
  var a = db.add("Widget", 3, 1250);
  db.remove(999999);
  assert.deepStrictEqual(db.all(), [a]);
});
