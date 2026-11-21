var test = require("node:test");
var beforeEach = test.beforeEach;
var assert = require("node:assert");
var db = require("../src/db");
var handlers = require("../src/handlers");
var helpers = require("./helpers");

beforeEach(function () {
  helpers.reset();
});

// index

test("index renders the heading, the table header and an empty total", function () {
  var res = helpers.fakeRes();
  handlers.index({}, res);
  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.body.indexOf("<h1>Stock</h1>") !== -1);
  assert.ok(res.body.indexOf("<td>id</td><td>name</td><td>qty</td><td>price</td>") !== -1);
  assert.ok(res.body.indexOf("<p>total: $0.00</p>") !== -1);
});

test("index renders one row per item with the price as dollars", function () {
  var it = db.add("Widget", 3, 1250);
  var res = helpers.fakeRes();
  handlers.index({}, res);
  assert.ok(res.body.indexOf("<td>" + it.id + "</td>") !== -1);
  assert.ok(res.body.indexOf("<td>Widget</td>") !== -1);
  assert.ok(res.body.indexOf("<td>3</td>") !== -1);
  assert.ok(res.body.indexOf("<td>$12.50</td>") !== -1);
  assert.ok(res.body.indexOf('<a href="/delete?id=' + it.id + '">delete</a>') !== -1);
});

test("index totals qty times price across every row", function () {
  db.add("Widget", 3, 1250);
  db.add("Gasket", 12, 499);
  db.add("Flange", 1, 19999);
  var res = helpers.fakeRes();
  handlers.index({}, res);
  assert.ok(res.body.indexOf("<p>total: $297.37</p>") !== -1);
});

test("index escapes the name it interpolates", function () {
  db.add("<script>alert(1)</script>", 1, 100);
  var res = helpers.fakeRes();
  handlers.index({}, res);
  assert.ok(res.body.indexOf("<script>alert(1)</script>") === -1);
  assert.ok(res.body.indexOf("&lt;script&gt;alert(1)&lt;/script&gt;") !== -1);
});

test("index offers the add form and the export link", function () {
  var res = helpers.fakeRes();
  handlers.index({}, res);
  assert.ok(res.body.indexOf('<form method="post" action="/add">') !== -1);
  assert.ok(res.body.indexOf('<input name="name"') !== -1);
  assert.ok(res.body.indexOf('<input name="qty"') !== -1);
  assert.ok(res.body.indexOf('<input name="price"') !== -1);
  assert.ok(res.body.indexOf('<a href="/export">export csv</a>') !== -1);
});

// add

test("add stores the item and redirects home", function () {
  var res = helpers.fakeRes();
  handlers.add({ body: { name: "Widget", qty: "3", price: "1250" } }, res);
  assert.strictEqual(res.redirectedTo, "/");
  var items = db.all();
  assert.strictEqual(items.length, 1);
  assert.strictEqual(items[0].name, "Widget");
  assert.strictEqual(items[0].qty, 3);
  assert.strictEqual(items[0].price, 1250);
});

test("add refuses a missing name with 400 and stores nothing", function () {
  var res = helpers.fakeRes();
  handlers.add({ body: { qty: "3", price: "1250" } }, res);
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body, "name required");
  assert.strictEqual(res.redirectedTo, null);
  assert.deepStrictEqual(db.all(), []);
});

test("add refuses an empty name too", function () {
  var res = helpers.fakeRes();
  handlers.add({ body: { name: "", qty: "3", price: "1250" } }, res);
  assert.strictEqual(res.statusCode, 400);
  assert.deepStrictEqual(db.all(), []);
});

// being lenient with input is deliberate: this is a tool for one person
// typing quickly, so a bad number is coerced rather than rejected.
test("add coerces a non-numeric qty to 1", function () {
  var res = helpers.fakeRes();
  handlers.add({ body: { name: "Widget", qty: "lots", price: "1250" } }, res);
  assert.strictEqual(res.redirectedTo, "/");
  assert.strictEqual(db.all()[0].qty, 1);
});

test("add coerces a non-numeric price to 0", function () {
  var res = helpers.fakeRes();
  handlers.add({ body: { name: "Widget", qty: "3", price: "free" } }, res);
  assert.strictEqual(res.redirectedTo, "/");
  assert.strictEqual(db.all()[0].price, 0);
});

test("add coerces a missing qty and price the same way", function () {
  var res = helpers.fakeRes();
  handlers.add({ body: { name: "Widget" } }, res);
  assert.strictEqual(db.all()[0].qty, 1);
  assert.strictEqual(db.all()[0].price, 0);
});

test("add keeps the price in whole cents", function () {
  var res = helpers.fakeRes();
  handlers.add({ body: { name: "Widget", qty: "2", price: "275.9" } }, res);
  assert.strictEqual(db.all()[0].price, 275);
});

// del

test("del removes the item and redirects home", function () {
  var it = db.add("Widget", 3, 1250);
  var res = helpers.fakeRes();
  handlers.del({ query: { id: String(it.id) } }, res);
  assert.strictEqual(res.redirectedTo, "/");
  assert.deepStrictEqual(db.all(), []);
});

test("del leaves the other rows alone", function () {
  var a = db.add("a", 1, 100);
  var b = db.add("b", 1, 100);
  var res = helpers.fakeRes();
  handlers.del({ query: { id: String(b.id) } }, res);
  assert.strictEqual(db.all().length, 1);
  assert.strictEqual(db.all()[0].id, a.id);
});

test("del refuses a missing id with 400 and removes nothing", function () {
  db.add("Widget", 3, 1250);
  var res = helpers.fakeRes();
  handlers.del({ query: {} }, res);
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body, "id required");
  assert.strictEqual(res.redirectedTo, null);
  assert.strictEqual(db.all().length, 1);
});

test("del of an unknown id still redirects and changes nothing", function () {
  db.add("Widget", 3, 1250);
  var res = helpers.fakeRes();
  handlers.del({ query: { id: "9999" } }, res);
  assert.strictEqual(res.redirectedTo, "/");
  assert.strictEqual(db.all().length, 1);
});

// exportCsv

test("exportCsv writes a header row even with nothing to export", function () {
  var res = helpers.fakeRes();
  handlers.exportCsv({}, res);
  assert.strictEqual(res.body, "id,name,qty,price\n");
});

test("exportCsv writes one line per item with no dollar sign", function () {
  var a = db.add("Widget", 3, 1250);
  var b = db.add("Gasket", 12, 499);
  var res = helpers.fakeRes();
  handlers.exportCsv({}, res);
  assert.strictEqual(
    res.body,
    "id,name,qty,price\n" +
      a.id + ",Widget,3,12.50\n" +
      b.id + ",Gasket,12,4.99\n"
  );
});

test("exportCsv sets the csv content type and the download filename", function () {
  var res = helpers.fakeRes();
  handlers.exportCsv({}, res);
  assert.strictEqual(res.headers["Content-Type"], "text/csv");
  assert.strictEqual(res.headers["Content-Disposition"], 'attachment; filename="stock.csv"');
});

// health

test("health answers ok", function () {
  var res = helpers.fakeRes();
  handlers.health({}, res);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body, "ok");
});
