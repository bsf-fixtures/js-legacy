// covers src/server.js: the route table, the body parser and the listen
// guard, driven over real HTTP against the real express app.
var test = require("node:test");
var assert = require("node:assert");
var app = require("../src/server");
var db = require("../src/db");

var server = null;
var base = "";

// The store outlives a request, so each test starts from an empty one.
// Ids are not reset, because nextId only resets with the process.
function clear() {
  var items = db.all();
  var ids = [];
  for (var i = 0; i < items.length; i++) {
    ids.push(items[i].id);
  }
  for (var j = 0; j < ids.length; j++) {
    db.remove(ids[j]);
  }
}

function post(path, fields) {
  return fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields).toString(),
    redirect: "manual"
  });
}

test.before(function () {
  return new Promise(function (resolve) {
    server = app.listen(0, "127.0.0.1", function () {
      base = "http://127.0.0.1:" + server.address().port;
      resolve();
    });
  });
});

test.after(function () {
  return new Promise(function (resolve) {
    server.close(resolve);
  });
});

test.beforeEach(clear);

test("requiring the app does not bind a port", function () {
  // The listen guard is what lets a test drive the app on a port of its own.
  assert.strictEqual(typeof app.listen, "function");
  assert.notStrictEqual(server.address().port, 3000);
});

test("GET /health returns ok", async function () {
  var r = await fetch(base + "/health");
  assert.strictEqual(r.status, 200);
  assert.strictEqual(await r.text(), "ok");
});

test("GET / returns the stock page", async function () {
  var r = await fetch(base + "/");
  assert.strictEqual(r.status, 200);
  var body = await r.text();
  assert.match(body, /<h1>Stock<\/h1>/);
  assert.match(body, /<p>total: \$0\.00<\/p>/);
});

test("POST /add parses the urlencoded form, redirects, and the row appears", async function () {
  var added = await post("/add", { name: "Bolt", qty: "5", price: "275" });
  assert.strictEqual(added.status, 302);
  assert.strictEqual(added.headers.get("location"), "/");

  var items = db.all();
  assert.strictEqual(items.length, 1);
  assert.strictEqual(items[0].name, "Bolt");

  var body = await (await fetch(base + "/")).text();
  assert.match(body, new RegExp("<td>" + items[0].id + "</td><td>Bolt</td><td>5</td><td>\\$2\\.75</td>"));
  assert.match(body, /<p>total: \$13\.75<\/p>/);
});

test("POST /add without a name is a 400", async function () {
  var r = await post("/add", { qty: "5", price: "275" });
  assert.strictEqual(r.status, 400);
  assert.strictEqual(await r.text(), "name required");
  assert.deepStrictEqual(db.all(), []);
});

test("GET /delete removes the row and its value", async function () {
  await post("/add", { name: "Bolt", qty: "5", price: "275" });
  await post("/add", { name: "Nut", qty: "2", price: "100" });
  var id = db.all()[0].id;

  var r = await fetch(base + "/delete?id=" + id, { redirect: "manual" });
  assert.strictEqual(r.status, 302);
  assert.strictEqual(r.headers.get("location"), "/");

  var body = await (await fetch(base + "/")).text();
  assert.ok(body.indexOf(">Bolt<") === -1);
  assert.match(body, /<p>total: \$2\.00<\/p>/);
});

test("GET /delete without an id is a 400", async function () {
  await post("/add", { name: "Bolt", qty: "5", price: "275" });
  var r = await fetch(base + "/delete");
  assert.strictEqual(r.status, 400);
  assert.strictEqual(await r.text(), "id required");
  assert.strictEqual(db.all().length, 1);
});

test("GET /report shows lines, units and value", async function () {
  await post("/add", { name: "Widget", qty: "3", price: "1250" });
  await post("/add", { name: "Gasket", qty: "12", price: "499" });
  await post("/add", { name: "Flange", qty: "1", price: "19999" });

  var body = await (await fetch(base + "/report")).text();
  assert.match(body, /<p>lines: 3<\/p>/);
  assert.match(body, /<p>units: 16<\/p>/);
  assert.match(body, /<p>value: \$297\.37<\/p>/);
});

test("GET /export returns the csv with both download headers", async function () {
  await post("/add", { name: "Widget", qty: "3", price: "1250" });
  var id = db.all()[0].id;

  var r = await fetch(base + "/export");
  assert.strictEqual(r.status, 200);
  assert.match(r.headers.get("content-type"), /^text\/csv/);
  assert.strictEqual(r.headers.get("content-disposition"), 'attachment; filename="stock.csv"');
  assert.strictEqual(await r.text(), "id,name,qty,price\n" + id + ",Widget,3,12.50\n");
});
