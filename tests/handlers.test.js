var test = require("node:test");
var assert = require("node:assert");
var db = require("../src/db");
var helpers = require("./helpers");

var h = null;

test.before(async function () {
  h = await helpers.start();
});

test.after(async function () {
  await helpers.stop(h);
});

test.beforeEach(function () {
  helpers.reset();
});

test("GET /health returns ok", async function () {
  var res = await helpers.get(h.url + "/health");
  assert.strictEqual(res.status, 200);
  assert.strictEqual(await res.text(), "ok");
});

test("GET / renders the empty stock page", async function () {
  var res = await helpers.get(h.url + "/");
  assert.strictEqual(res.status, 200);
  var body = await res.text();
  assert.match(body, /<h1>Stock<\/h1>/);
  assert.match(body, /<table border=1>/);
  assert.match(body, /<p>total: \$0\.00<\/p>/);
  assert.match(body, /<form method="post" action="\/add">/);
  assert.match(body, /<a href="\/export">export csv<\/a>/);
});

test("GET / renders a row per item with the price in dollars", async function () {
  var a = db.add("Widget", 3, 1250);
  var res = await helpers.get(h.url + "/");
  var body = await res.text();
  assert.match(body, new RegExp("<td>" + a.id + "</td>"));
  assert.match(body, /<td>Widget<\/td>/);
  assert.match(body, /<td>3<\/td>/);
  assert.match(body, /<td>\$12\.50<\/td>/);
  assert.match(body, new RegExp('<a href="/delete\\?id=' + a.id + '">delete</a>'));
});

test("GET / totals qty times price, not price", async function () {
  db.add("Widget", 3, 1250);
  db.add("Gasket", 12, 499);
  var res = await helpers.get(h.url + "/");
  var body = await res.text();
  assert.match(body, /<p>total: \$97\.38<\/p>/);
});

test("GET / escapes the name it renders", async function () {
  db.add("<b>&</b>", 1, 100);
  var res = await helpers.get(h.url + "/");
  var body = await res.text();
  assert.match(body, /<td>&lt;b&gt;&amp;&lt;\/b&gt;<\/td>/);
  assert.doesNotMatch(body, /<td><b>/);
});

test("POST /add stores the item and redirects to /", async function () {
  var res = await helpers.post(h.url + "/add", { name: "Bolt", qty: "5", price: "275" });
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.get("location"), "/");
  var items = db.all();
  assert.strictEqual(items.length, 1);
  assert.strictEqual(items[0].name, "Bolt");
  assert.strictEqual(items[0].qty, 5);
  assert.strictEqual(items[0].price, 275);
});

test("POST /add parses qty and price as integers, not strings", async function () {
  await helpers.post(h.url + "/add", { name: "Bolt", qty: "5", price: "275" });
  var it = db.all()[0];
  assert.strictEqual(typeof it.qty, "number");
  assert.strictEqual(typeof it.price, "number");
});

test("POST /add without a name is refused with 400", async function () {
  var res = await helpers.post(h.url + "/add", { qty: "5", price: "275" });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(await res.text(), "name required");
  assert.deepStrictEqual(db.all(), []);
});

test("POST /add with an empty name is refused with 400", async function () {
  var res = await helpers.post(h.url + "/add", { name: "", qty: "5", price: "275" });
  assert.strictEqual(res.status, 400);
  assert.deepStrictEqual(db.all(), []);
});

test("POST /add is lenient: a non-numeric qty becomes 1", async function () {
  // deliberate. this is a tool for one person typing quickly.
  await helpers.post(h.url + "/add", { name: "Bolt", qty: "lots", price: "275" });
  assert.strictEqual(db.all()[0].qty, 1);
});

test("POST /add is lenient: a non-numeric price becomes 0", async function () {
  await helpers.post(h.url + "/add", { name: "Bolt", qty: "5", price: "cheap" });
  assert.strictEqual(db.all()[0].price, 0);
});

test("POST /add with qty and price missing falls back to 1 and 0", async function () {
  await helpers.post(h.url + "/add", { name: "Bolt" });
  var it = db.all()[0];
  assert.strictEqual(it.qty, 1);
  assert.strictEqual(it.price, 0);
});

test("GET /delete removes the row and redirects to /", async function () {
  var a = db.add("Widget", 3, 1250);
  var b = db.add("Gasket", 12, 499);
  var res = await helpers.get(h.url + "/delete?id=" + a.id);
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.get("location"), "/");
  assert.deepStrictEqual(db.all(), [b]);
});

test("GET /delete drops that line out of the total", async function () {
  var a = db.add("Widget", 3, 1250);
  db.add("Gasket", 12, 499);
  await helpers.get(h.url + "/delete?id=" + a.id);
  var body = await (await helpers.get(h.url + "/")).text();
  assert.match(body, /<p>total: \$59\.88<\/p>/);
});

test("GET /delete without an id is refused with 400", async function () {
  var a = db.add("Widget", 3, 1250);
  var res = await helpers.get(h.url + "/delete");
  assert.strictEqual(res.status, 400);
  assert.strictEqual(await res.text(), "id required");
  assert.deepStrictEqual(db.all(), [a]);
});

test("GET /delete with an unknown id redirects and changes nothing", async function () {
  var a = db.add("Widget", 3, 1250);
  var res = await helpers.get(h.url + "/delete?id=999999");
  assert.strictEqual(res.status, 302);
  assert.deepStrictEqual(db.all(), [a]);
});

test("GET /export sends a csv with the download headers", async function () {
  var res = await helpers.get(h.url + "/export");
  assert.strictEqual(res.status, 200);
  assert.match(res.headers.get("content-type"), /^text\/csv/);
  assert.strictEqual(res.headers.get("content-disposition"), 'attachment; filename="stock.csv"');
});

test("GET /export writes a header row and one row per item", async function () {
  var a = db.add("Widget", 3, 1250);
  var b = db.add("Gasket", 12, 499);
  var body = await (await helpers.get(h.url + "/export")).text();
  assert.strictEqual(
    body,
    "id,name,qty,price\n" + a.id + ",Widget,3,12.50\n" + b.id + ",Gasket,12,4.99\n"
  );
});

test("GET /export prices have no dollar sign", async function () {
  db.add("Widget", 3, 1250);
  var body = await (await helpers.get(h.url + "/export")).text();
  assert.doesNotMatch(body, /\$/);
});

test("GET /export of an empty store is the header row alone", async function () {
  var body = await (await helpers.get(h.url + "/export")).text();
  assert.strictEqual(body, "id,name,qty,price\n");
});
