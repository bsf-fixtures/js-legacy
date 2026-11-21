// the route table, driven over real http. require.main is not this module, so
// requiring src/server gives the app without binding the configured port.
var test = require("node:test");
var before = test.before;
var after = test.after;
var beforeEach = test.beforeEach;
var assert = require("node:assert");
var app = require("../src/server");
var helpers = require("./helpers");

var server = null;
var base = "";

before(function (t, done) {
  server = app.listen(0, "127.0.0.1", function () {
    base = "http://127.0.0.1:" + server.address().port;
    done();
  });
});

after(function (t, done) {
  server.close(done);
});

beforeEach(function () {
  helpers.reset();
});

function post(path, fields) {
  return fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields).toString(),
    redirect: "manual"
  });
}

function get(path) {
  return fetch(base + path, { redirect: "manual" });
}

test("GET /health answers ok", async function () {
  var res = await get("/health");
  assert.strictEqual(res.status, 200);
  assert.strictEqual(await res.text(), "ok");
});

test("GET / serves the stock page", async function () {
  var res = await get("/");
  assert.strictEqual(res.status, 200);
  var body = await res.text();
  assert.ok(body.indexOf("<h1>Stock</h1>") !== -1);
  assert.ok(body.indexOf("<p>total: $0.00</p>") !== -1);
});

test("POST /add parses the form body and redirects home", async function () {
  var res = await post("/add", { name: "Bolt", qty: "5", price: "275" });
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.get("location"), "/");
  var body = await (await get("/")).text();
  assert.ok(body.indexOf("<td>Bolt</td>") !== -1);
  assert.ok(body.indexOf("<td>$2.75</td>") !== -1);
  assert.ok(body.indexOf("<p>total: $13.75</p>") !== -1);
});

test("POST /add without a name answers 400", async function () {
  var res = await post("/add", { qty: "5", price: "275" });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(await res.text(), "name required");
});

test("GET /delete removes the row from the page and the total", async function () {
  await post("/add", { name: "Bolt", qty: "5", price: "275" });
  await post("/add", { name: "Nut", qty: "2", price: "100" });
  var page = await (await get("/")).text();
  var id = /href="\/delete\?id=(\d+)">delete<\/a>/.exec(page)[1];

  var res = await get("/delete?id=" + id);
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.get("location"), "/");

  var body = await (await get("/")).text();
  assert.ok(body.indexOf("<td>Bolt</td>") === -1);
  assert.ok(body.indexOf("<td>Nut</td>") !== -1);
  assert.ok(body.indexOf("<p>total: $2.00</p>") !== -1);
});

test("GET /delete without an id answers 400", async function () {
  var res = await get("/delete");
  assert.strictEqual(res.status, 400);
  assert.strictEqual(await res.text(), "id required");
});

test("GET /report serves the report page", async function () {
  await post("/add", { name: "Bolt", qty: "5", price: "275" });
  var res = await get("/report");
  assert.strictEqual(res.status, 200);
  var body = await res.text();
  assert.ok(body.indexOf("<p>lines: 1</p>") !== -1);
  assert.ok(body.indexOf("<p>units: 5</p>") !== -1);
  assert.ok(body.indexOf("<p>value: $13.75</p>") !== -1);
});

test("GET /export serves the csv as a download", async function () {
  await post("/add", { name: "Bolt", qty: "5", price: "275" });
  var res = await get("/export");
  assert.strictEqual(res.status, 200);
  assert.ok(res.headers.get("content-type").indexOf("text/csv") !== -1);
  assert.strictEqual(res.headers.get("content-disposition"), 'attachment; filename="stock.csv"');
  var body = await res.text();
  assert.ok(body.indexOf("id,name,qty,price\n") === 0);
  assert.ok(body.indexOf(",Bolt,5,2.75\n") !== -1);
});

test("an unknown url is a 404", async function () {
  var res = await get("/nope");
  assert.strictEqual(res.status, 404);
});
