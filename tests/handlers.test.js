// src/handlers.js over HTTP: the stock page, add, delete, the csv and health.
var test = require("node:test");
var assert = require("node:assert");
var helper = require("./helpers/app");

var WIDGET = { name: "Widget", qty: "3", price: "1250" };
var GASKET = { name: "Gasket", qty: "12", price: "499" };

async function started(t) {
  var app = await helper.start();
  t.after(function () {
    return app.stop();
  });
  return app;
}

test("GET / on an empty store renders the shell and a zero total", async function (t) {
  var app = await started(t);

  var res = await app.get("/");
  var body = await res.text();

  assert.strictEqual(res.status, 200);
  assert.match(body, /<h1>Stock<\/h1>/);
  assert.match(body, /<tr><td>id<\/td><td>name<\/td><td>qty<\/td><td>price<\/td>/);
  assert.match(body, /<p>total: \$0\.00<\/p>/);
  assert.match(body, /<form method="post" action="\/add">/);
  assert.match(body, /<a href="\/export">export csv<\/a>/);
  // no data rows yet: the only <tr> is the header
  assert.strictEqual(body.split("<tr>").length - 1, 1);
});

test("GET / renders one row per item, with the price in dollars", async function (t) {
  var app = await started(t);
  await helper.seed(app, [WIDGET]);

  var body = await (await app.get("/")).text();

  assert.match(body, /<td>1<\/td><td>Widget<\/td><td>3<\/td><td>\$12\.50<\/td>/);
  assert.match(body, /<a href="\/delete\?id=1">delete<\/a>/);
});

test("GET / totals qty x price across lines, not price", async function (t) {
  var app = await started(t);
  await helper.seed(app, [WIDGET, GASKET]);

  var body = await (await app.get("/")).text();

  // 3 x 1250 + 12 x 499 = 9738 cents
  assert.match(body, /<p>total: \$97\.38<\/p>/);
});

test("GET / escapes a name before interpolating it", async function (t) {
  var app = await started(t);
  await helper.seed(app, [{ name: "<b>Bolt</b> & nut", qty: "1", price: "100" }]);

  var body = await (await app.get("/")).text();

  assert.match(body, /<td>&lt;b&gt;Bolt&lt;\/b&gt; &amp; nut<\/td>/);
  assert.ok(body.indexOf("<b>Bolt</b>") === -1, "the raw tag reached the page");
});

test("POST /add stores the item and redirects to /", async function (t) {
  var app = await started(t);

  var res = await app.post("/add", WIDGET);

  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.get("location"), "/");
  assert.match(await (await app.get("/")).text(), /<td>Widget<\/td>/);
});

test("POST /add without a name is refused and stores nothing", async function (t) {
  var app = await started(t);

  var res = await app.post("/add", { qty: "3", price: "1250" });

  assert.strictEqual(res.status, 400);
  assert.strictEqual(await res.text(), "name required");
  assert.match(await (await app.get("/")).text(), /<p>total: \$0\.00<\/p>/);
});

test("POST /add coerces a non-numeric qty to 1 and a non-numeric price to 0", async function (t) {
  var app = await started(t);

  var res = await app.post("/add", { name: "Bolt", qty: "lots", price: "cheap" });

  assert.strictEqual(res.status, 302);
  var body = await (await app.get("/")).text();
  assert.match(body, /<td>1<\/td><td>Bolt<\/td><td>1<\/td><td>\$0\.00<\/td>/);
  assert.match(body, /<p>total: \$0\.00<\/p>/);
});

test("POST /add with no qty or price field at all takes the same fallbacks", async function (t) {
  var app = await started(t);

  await app.post("/add", { name: "Bolt" });

  assert.match(await (await app.get("/")).text(), /<td>Bolt<\/td><td>1<\/td><td>\$0\.00<\/td>/);
});

test("GET /delete removes the row and its value, and redirects to /", async function (t) {
  var app = await started(t);
  await helper.seed(app, [WIDGET, GASKET]);

  // the id arrives as a string here and is stored as a number; db compares
  // loosely, which is what makes this work.
  var res = await app.get("/delete?id=1");

  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.get("location"), "/");
  var body = await (await app.get("/")).text();
  assert.ok(body.indexOf("<td>Widget</td>") === -1, "the deleted row is still on the page");
  assert.match(body, /<td>Gasket<\/td>/);
  assert.match(body, /<p>total: \$59\.88<\/p>/);
});

test("GET /delete without an id is refused and removes nothing", async function (t) {
  var app = await started(t);
  await helper.seed(app, [WIDGET]);

  var res = await app.get("/delete");

  assert.strictEqual(res.status, 400);
  assert.strictEqual(await res.text(), "id required");
  assert.match(await (await app.get("/")).text(), /<td>Widget<\/td>/);
});

test("GET /delete with an unknown id leaves the store alone", async function (t) {
  var app = await started(t);
  await helper.seed(app, [WIDGET]);

  var res = await app.get("/delete?id=999");

  assert.strictEqual(res.status, 302);
  assert.match(await (await app.get("/")).text(), /<p>total: \$37\.50<\/p>/);
});

test("GET /export sends a csv attachment with no dollar signs", async function (t) {
  var app = await started(t);
  await helper.seed(app, [WIDGET, GASKET]);

  var res = await app.get("/export");
  var body = await res.text();

  assert.strictEqual(res.status, 200);
  assert.match(res.headers.get("content-type"), /^text\/csv/);
  assert.strictEqual(
    res.headers.get("content-disposition"),
    'attachment; filename="stock.csv"'
  );
  assert.strictEqual(body, "id,name,qty,price\n1,Widget,3,12.50\n2,Gasket,12,4.99\n");
});

test("GET /export on an empty store sends the header row alone", async function (t) {
  var app = await started(t);

  assert.strictEqual(await (await app.get("/export")).text(), "id,name,qty,price\n");
});

test("GET /health answers ok", async function (t) {
  var app = await started(t);

  var res = await app.get("/health");

  assert.strictEqual(res.status, 200);
  assert.strictEqual(await res.text(), "ok");
});
