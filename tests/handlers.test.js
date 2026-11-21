// covers src/handlers.js: the five handlers, their input parsing and the
// strings they build.
var test = require("node:test");
var assert = require("node:assert");

// handlers.js holds its own reference to the store, so both modules are
// reloaded together and the store is read back through the same instance.
function fresh() {
  delete require.cache[require.resolve("../src/db")];
  delete require.cache[require.resolve("../src/handlers")];
  var handlers = require("../src/handlers");
  return { handlers: handlers, db: require("../src/db") };
}

// The parts of express's res that these handlers use, and nothing else.
function res() {
  var r = {
    code: 200,
    body: null,
    redirected: null,
    headers: {},
    status: function (c) {
      r.code = c;
      return r;
    },
    send: function (b) {
      r.body = b;
      return r;
    },
    redirect: function (to) {
      r.redirected = to;
      return r;
    },
    setHeader: function (k, v) {
      r.headers[k] = v;
    }
  };
  return r;
}

test("index renders the heading, the form and the export link when empty", function () {
  var f = fresh();
  var r = res();
  f.handlers.index({}, r);
  assert.match(r.body, /<h1>Stock<\/h1>/);
  assert.match(r.body, /<form method="post" action="\/add">/);
  assert.match(r.body, /<a href="\/export">export csv<\/a>/);
  assert.match(r.body, /<p>total: \$0\.00<\/p>/);
});

test("index renders a row per item with the price in dollars and a delete link", function () {
  var f = fresh();
  f.db.add("Widget", 3, 1250);
  var r = res();
  f.handlers.index({}, r);
  assert.match(r.body, /<td>1<\/td><td>Widget<\/td><td>3<\/td><td>\$12\.50<\/td>/);
  assert.match(r.body, /<a href="\/delete\?id=1">delete<\/a>/);
});

test("index totals qty times price across every row", function () {
  var f = fresh();
  f.db.add("Widget", 3, 1250);
  f.db.add("Gasket", 12, 499);
  var r = res();
  f.handlers.index({}, r);
  assert.match(r.body, /<p>total: \$97\.38<\/p>/);
});

test("index escapes the name it interpolates", function () {
  var f = fresh();
  f.db.add("<script>alert(1)</script>", 1, 100);
  var r = res();
  f.handlers.index({}, r);
  assert.ok(r.body.indexOf("<script>alert(1)</script>") === -1);
  assert.match(r.body, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test("add stores the item and redirects", function () {
  var f = fresh();
  var r = res();
  f.handlers.add({ body: { name: "Widget", qty: "3", price: "1250" } }, r);
  assert.strictEqual(r.redirected, "/");
  assert.strictEqual(f.db.all().length, 1);
  assert.strictEqual(f.db.all()[0].qty, 3);
  assert.strictEqual(f.db.all()[0].price, 1250);
});

test("add refuses a missing name with 400 and stores nothing", function () {
  var f = fresh();
  var r = res();
  f.handlers.add({ body: {} }, r);
  assert.strictEqual(r.code, 400);
  assert.strictEqual(r.body, "name required");
  assert.strictEqual(r.redirected, null);
  assert.deepStrictEqual(f.db.all(), []);
});

test("add refuses an empty name too", function () {
  var f = fresh();
  var r = res();
  f.handlers.add({ body: { name: "", qty: "3", price: "1250" } }, r);
  assert.strictEqual(r.code, 400);
  assert.deepStrictEqual(f.db.all(), []);
});

// Being lenient with qty and price is deliberate: this is a tool for one
// person typing quickly, so a bad number is coerced rather than rejected.
test("add coerces a non-numeric qty to 1 and a non-numeric price to 0", function () {
  var f = fresh();
  var r = res();
  f.handlers.add({ body: { name: "Widget", qty: "lots", price: "cheap" } }, r);
  assert.strictEqual(r.redirected, "/");
  assert.strictEqual(f.db.all()[0].qty, 1);
  assert.strictEqual(f.db.all()[0].price, 0);
});

test("add coerces a missing qty and price the same way", function () {
  var f = fresh();
  var r = res();
  f.handlers.add({ body: { name: "Widget" } }, r);
  assert.strictEqual(f.db.all()[0].qty, 1);
  assert.strictEqual(f.db.all()[0].price, 0);
});

test("del removes the item named by the query string and redirects", function () {
  var f = fresh();
  f.db.add("Widget", 3, 1250);
  f.db.add("Gasket", 12, 499);
  var r = res();
  f.handlers.del({ query: { id: "1" } }, r);
  assert.strictEqual(r.redirected, "/");
  assert.strictEqual(f.db.all().length, 1);
  assert.strictEqual(f.db.all()[0].name, "Gasket");
});

test("del refuses a missing id with 400 and removes nothing", function () {
  var f = fresh();
  f.db.add("Widget", 3, 1250);
  var r = res();
  f.handlers.del({ query: {} }, r);
  assert.strictEqual(r.code, 400);
  assert.strictEqual(r.body, "id required");
  assert.strictEqual(f.db.all().length, 1);
});

test("exportCsv sends a header row and both download headers", function () {
  var f = fresh();
  var r = res();
  f.handlers.exportCsv({}, r);
  assert.strictEqual(r.body, "id,name,qty,price\n");
  assert.strictEqual(r.headers["Content-Type"], "text/csv");
  assert.strictEqual(r.headers["Content-Disposition"], 'attachment; filename="stock.csv"');
});

test("exportCsv writes one row per item with the price and no dollar sign", function () {
  var f = fresh();
  f.db.add("Widget", 3, 1250);
  f.db.add("Gasket", 12, 499);
  var r = res();
  f.handlers.exportCsv({}, r);
  assert.strictEqual(r.body, "id,name,qty,price\n1,Widget,3,12.50\n2,Gasket,12,4.99\n");
});

test("health sends ok", function () {
  var f = fresh();
  var r = res();
  f.handlers.health({}, r);
  assert.strictEqual(r.body, "ok");
  assert.strictEqual(r.code, 200);
});
