const test = require("node:test");
const assert = require("node:assert");
const db = require("../src/db");
const helpers = require("./helpers");

test.beforeEach(helpers.clearDb);

test("all starts empty and returns what was added", function () {
  assert.deepStrictEqual(db.all(), []);
  db.add("Bolt", 5, 275);
  assert.strictEqual(db.all().length, 1);
});

test("add stores name, qty and price unchanged and stamps a created string", function () {
  const it = db.add("Bolt", 5, 275);
  assert.strictEqual(it.name, "Bolt");
  assert.strictEqual(it.qty, 5);
  assert.strictEqual(it.price, 275);
  assert.strictEqual(typeof it.created, "string");
  assert.ok(it.created.length > 0);
});

test("add hands out a new id every time", function () {
  const a = db.add("Bolt", 1, 100);
  const b = db.add("Nut", 1, 100);
  assert.ok(Number.isInteger(a.id));
  assert.notStrictEqual(a.id, b.id);
  assert.strictEqual(b.id, a.id + 1);
});

test("find returns the item for a numeric id and null for an unknown one", function () {
  const it = db.add("Bolt", 5, 275);
  assert.strictEqual(db.find(it.id), it);
  assert.strictEqual(db.find(it.id + 1000), null);
});

test("find accepts the string id that arrives from a query string", function () {
  // db.js compares with ==, which is what makes GET /delete?id=3 work: the id
  // arrives as a string and is stored as a number. Tightening that comparison
  // without parsing at the boundary first would break /delete silently.
  const it = db.add("Bolt", 5, 275);
  assert.strictEqual(db.find(String(it.id)), it);
});

test("remove drops only the matching item", function () {
  const a = db.add("Bolt", 5, 275);
  const b = db.add("Nut", 2, 50);
  db.remove(a.id);
  assert.strictEqual(db.all().length, 1);
  assert.strictEqual(db.all()[0].id, b.id);
  assert.strictEqual(db.find(a.id), null);
});

test("remove accepts a string id too", function () {
  const it = db.add("Bolt", 5, 275);
  db.remove(String(it.id));
  assert.deepStrictEqual(db.all(), []);
});

test("remove of an unknown id leaves the store alone", function () {
  const it = db.add("Bolt", 5, 275);
  db.remove(it.id + 1000);
  assert.strictEqual(db.all().length, 1);
});
