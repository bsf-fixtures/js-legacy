const test = require("node:test");
const assert = require("node:assert");
const db = require("../src/db");
const helpers = require("./helpers");

test.beforeEach(helpers.clear);

test("add returns the stored item with an id and a created stamp", function () {
  const it = db.add("Bolt", 5, 275);
  assert.strictEqual(it.name, "Bolt");
  assert.strictEqual(it.qty, 5);
  assert.strictEqual(it.price, 275);
  assert.strictEqual(typeof it.id, "number");
  assert.strictEqual(typeof it.created, "string");
  assert.ok(!isNaN(Date.parse(it.created)));
});

test("ids are allocated in ascending order and are not reused", function () {
  const a = db.add("Widget", 1, 100);
  const b = db.add("Gasket", 1, 100);
  assert.ok(b.id > a.id);
  db.remove(a.id);
  const c = db.add("Flange", 1, 100);
  assert.ok(c.id > b.id);
});

test("all returns the items in the order they were added", function () {
  db.add("Widget", 3, 1250);
  db.add("Gasket", 12, 499);
  const names = db.all().map(function (it) {
    return it.name;
  });
  assert.deepStrictEqual(names, ["Widget", "Gasket"]);
});

test("add stores the item it returns", function () {
  const it = db.add("Widget", 3, 1250);
  assert.strictEqual(db.all().length, 1);
  assert.strictEqual(db.all()[0], it);
});

test("find matches a numeric id", function () {
  const it = db.add("Widget", 3, 1250);
  assert.strictEqual(db.find(it.id), it);
});

test("find matches the string form of an id, which is how /delete arrives", function () {
  // Loose == in db.find is load-bearing: req.query.id is always a string
  // and ids are stored as numbers.
  const it = db.add("Widget", 3, 1250);
  assert.strictEqual(db.find(String(it.id)), it);
});

test("find returns null when nothing matches", function () {
  db.add("Widget", 3, 1250);
  assert.strictEqual(db.find(999999), null);
  assert.strictEqual(db.find("nope"), null);
});

test("remove drops the matching item and keeps the others", function () {
  const a = db.add("Widget", 3, 1250);
  const b = db.add("Gasket", 12, 499);
  db.remove(a.id);
  assert.deepStrictEqual(db.all(), [b]);
  assert.strictEqual(db.find(a.id), null);
});

test("remove accepts the string form of an id too", function () {
  const it = db.add("Widget", 3, 1250);
  db.remove(String(it.id));
  assert.deepStrictEqual(db.all(), []);
});

test("remove with an id that is not there leaves the list alone", function () {
  db.add("Widget", 3, 1250);
  db.remove(999999);
  assert.strictEqual(db.all().length, 1);
});
