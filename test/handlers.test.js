// tests for the http layer: the handlers in src/handlers.js and the routes
// they are wired to in src/server.js, driven over http the way a browser
// drives them, against the real express app.
var test = require("node:test");
var assert = require("node:assert");
var http = require("node:http");
var app = require("../src/server");
var db = require("../src/db");

var server = null;
var base = "";

// port 0, so these tests never collide with an app already on 3000
test.before(function () {
  return new Promise(function (resolve) {
    server = http.createServer(app);
    server.listen(0, "127.0.0.1", function () {
      base = "http://127.0.0.1:" + server.address().port;
      resolve();
    });
  });
});

test.after(function () {
  return new Promise(function (resolve) {
    server.close(function () {
      resolve();
    });
  });
});

// the store is one array shared by the whole process, so every test starts
// from an empty one. ids are not reset: nextId only ever moves forward, and
// no test may assume an id it did not read back.
test.beforeEach(function () {
  var items = db.all();
  for (var i = items.length - 1; i >= 0; i--) {
    db.remove(items[i].id);
  }
});

function get(path) {
  return fetch(base + path, { redirect: "manual" });
}

function post(path, fields) {
  return fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields).toString(),
    redirect: "manual"
  });
}

test("GET / renders the empty table, a zero total and the add form", async function () {
  var res = await get("/");
  var html = await res.text();
  assert.equal(res.status, 200);
  assert.match(html, /<h1>Stock<\/h1>/);
  assert.match(html, /<tr><td>id<\/td><td>name<\/td><td>qty<\/td><td>price<\/td><td><\/td><\/tr>/);
  assert.match(html, /<p>total: \$0\.00<\/p>/);
  assert.match(html, /<form method="post" action="\/add">/);
  assert.match(html, /<input name="price" placeholder="price in cents">/);
  assert.match(html, /<a href="\/export">export csv<\/a>/);
});

test("GET / renders a row per item, prices in dollars, and a delete link", async function () {
  var bolt = db.add("Bolt", 5, 275);
  var nut = db.add("Nut", 2, 100);
  var res = await get("/");
  var html = await res.text();
  assert.equal(res.status, 200);
  assert.match(html, new RegExp("<td>" + bolt.id + "</td><td>Bolt</td><td>5</td><td>\\$2\\.75</td>"));
  assert.match(html, new RegExp("<td>" + nut.id + "</td><td>Nut</td><td>2</td><td>\\$1\\.00</td>"));
  assert.match(html, new RegExp('<a href="/delete\\?id=' + bolt.id + '">delete</a>'));
});

test("GET / totals qty times price, not price", async function () {
  db.add("Bolt", 5, 275);
  db.add("Nut", 2, 100);
  var html = await (await get("/")).text();
  // 5 x 275 + 2 x 100 = 1575 cents
  assert.match(html, /<p>total: \$15\.75<\/p>/);
});

test("GET / escapes the name it interpolates", async function () {
  db.add("<b>Bolt & Nut</b>", 1, 100);
  var html = await (await get("/")).text();
  assert.match(html, /&lt;b&gt;Bolt &amp; Nut&lt;\/b&gt;/);
  assert.ok(html.indexOf("<b>Bolt") === -1);
});

test("POST /add stores the item and redirects to /", async function () {
  var res = await post("/add", { name: "Bolt", qty: "5", price: "275" });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("location"), "/");
  var items = db.all();
  assert.equal(items.length, 1);
  assert.equal(items[0].name, "Bolt");
  assert.equal(items[0].qty, 5);
  assert.equal(items[0].price, 275);
});

test("POST /add refuses a missing name with 400 and stores nothing", async function () {
  var res = await post("/add", { qty: "5", price: "275" });
  assert.equal(res.status, 400);
  assert.equal(await res.text(), "name required");
  assert.equal(db.all().length, 0);
});

test("POST /add is lenient: a bad qty becomes 1 and a bad price becomes 0", async function () {
  var res = await post("/add", { name: "Bolt", qty: "lots", price: "cheap" });
  assert.equal(res.status, 302);
  var items = db.all();
  assert.equal(items.length, 1);
  assert.equal(items[0].qty, 1);
  assert.equal(items[0].price, 0);
});

test("GET /delete removes that item and redirects to /", async function () {
  var bolt = db.add("Bolt", 5, 275);
  var nut = db.add("Nut", 2, 100);
  var res = await get("/delete?id=" + bolt.id);
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("location"), "/");
  var items = db.all();
  assert.equal(items.length, 1);
  assert.equal(items[0].id, nut.id);
});

test("GET /delete refuses a missing id with 400 and removes nothing", async function () {
  db.add("Bolt", 5, 275);
  var res = await get("/delete");
  assert.equal(res.status, 400);
  assert.equal(await res.text(), "id required");
  assert.equal(db.all().length, 1);
});

test("GET /export sends a csv attachment with prices and no dollar sign", async function () {
  var bolt = db.add("Bolt", 5, 275);
  var res = await get("/export");
  var body = await res.text();
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /^text\/csv/);
  assert.equal(res.headers.get("content-disposition"), 'attachment; filename="stock.csv"');
  assert.equal(body, "id,name,qty,price\n" + bolt.id + ",Bolt,5,2.75\n");
});

test("GET /export sends only the header row when there is nothing to export", async function () {
  var res = await get("/export");
  assert.equal(res.status, 200);
  assert.equal(await res.text(), "id,name,qty,price\n");
});

test("GET /health returns ok", async function () {
  var res = await get("/health");
  assert.equal(res.status, 200);
  assert.equal(await res.text(), "ok");
});

test("GET /report is wired to the report page", async function () {
  db.add("Bolt", 5, 275);
  var res = await get("/report");
  var html = await res.text();
  assert.equal(res.status, 200);
  assert.match(html, /<h1>Report<\/h1>/);
  assert.match(html, /<p>lines: 1<\/p>/);
});
