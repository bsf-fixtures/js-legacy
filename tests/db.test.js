// covers src/db.js: the in-memory store, its id allocation and its lookups.
var test = require("node:test");
var assert = require("node:assert");

// The store is module-level state, so each test gets its own copy of the
// module rather than inheriting whatever the last test left behind.
function fresh() {
  delete require.cache[require.resolve("../src/db")];
  return require("../src/db");
}

test("a new store is empty", function () {
  var db = fresh();
  assert.deepStrictEqual(db.all(), []);
});

test("add returns the stored item, with ids starting at 1", function () {
  var db = fresh();
  var it = db.add("Widget", 3, 1250);
  assert.strictEqual(it.id, 1);
  assert.strictEqual(it.name, "Widget");
  assert.strictEqual(it.qty, 3);
  assert.strictEqual(it.price, 1250);
  assert.strictEqual(typeof it.created, "string");
});

test("ids increment and nothing is reused", function () {
  var db = fresh();
  assert.strictEqual(db.add("a", 1, 1).id, 1);
  assert.strictEqual(db.add("b", 1, 1).id, 2);
  db.remove(2);
  assert.strictEqual(db.add("c", 1, 1).id, 3);
});

test("all returns every item that was added, in order", function () {
  var db = fresh();
  db.add("Widget", 3, 1250);
  db.add("Gasket", 12, 499);
  var items = db.all();
  assert.strictEqual(items.length, 2);
  assert.strictEqual(items[0].name, "Widget");
  assert.strictEqual(items[1].name, "Gasket");
});

test("find returns the item for a numeric id", function () {
  var db = fresh();
  db.add("Widget", 3, 1250);
  db.add("Gasket", 12, 499);
  assert.strictEqual(db.find(2).name, "Gasket");
});

// Ids are stored as numbers and arrive from req.query.id as strings, so the
// loose comparison in db.find is what makes /delete work at all.
test("find also matches a string id", function () {
  var db = fresh();
  db.add("Widget", 3, 1250);
  assert.strictEqual(db.find("1").name, "Widget");
});

test("find returns null when nothing matches", function () {
  var db = fresh();
  db.add("Widget", 3, 1250);
  assert.strictEqual(db.find(99), null);
  assert.strictEqual(db.find("99"), null);
});

test("remove drops the item with that id and keeps the rest", function () {
  var db = fresh();
  db.add("Widget", 3, 1250);
  db.add("Gasket", 12, 499);
  db.add("Flange", 1, 19999);
  db.remove(2);
  var names = [];
  for (var i = 0; i < db.all().length; i++) {
    names.push(db.all()[i].name);
  }
  assert.deepStrictEqual(names, ["Widget", "Flange"]);
});

test("remove also accepts a string id", function () {
  var db = fresh();
  db.add("Widget", 3, 1250);
  db.remove("1");
  assert.deepStrictEqual(db.all(), []);
});

test("removing an id that is not there changes nothing", function () {
  var db = fresh();
  db.add("Widget", 3, 1250);
  db.remove(99);
  assert.strictEqual(db.all().length, 1);
});
