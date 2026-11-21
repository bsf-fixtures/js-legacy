const test = require("node:test");
const assert = require("node:assert");
const db = require("../src/db");
const helpers = require("./helpers");

let app;

test.before(async function () {
  app = await helpers.startApp();
});

test.after(function () {
  return app.stop();
});

test.beforeEach(helpers.clearDb);

test("GET /health returns ok", async function () {
  const res = await fetch(app.url + "/health");
  assert.strictEqual(res.status, 200);
  assert.strictEqual(await res.text(), "ok");
});

test("GET / renders the empty stock page with the add form and export link", async function () {
  const res = await fetch(app.url + "/");
  const body = await res.text();
  assert.strictEqual(res.status, 200);
  assert.match(body, /<h1>Stock<\/h1>/);
  assert.match(body, /<td>id<\/td><td>name<\/td><td>qty<\/td><td>price<\/td>/);
  assert.match(body, /<p>total: \$0\.00<\/p>/);
  assert.match(body, /<form method="post" action="\/add">/);
  assert.match(body, /<a href="\/export">export csv<\/a>/);
});

test("GET / renders a row per item with the price in dollars and the running total", async function () {
  const bolt = db.add("Bolt", 5, 275);
  const body = await (await fetch(app.url + "/")).text();
  assert.match(body, new RegExp("<td>" + bolt.id + "</td><td>Bolt</td><td>5</td><td>\\$2\\.75</td>"));
  assert.match(body, new RegExp('<a href="/delete\\?id=' + bolt.id + '">delete</a>'));
  // qty x price, not price
  assert.match(body, /<p>total: \$13\.75<\/p>/);
});

test("GET / escapes an item name before interpolating it", async function () {
  db.add("Bolt <b> & co", 1, 100);
  const body = await (await fetch(app.url + "/")).text();
  assert.match(body, /<td>Bolt &lt;b&gt; &amp; co<\/td>/);
  assert.ok(!body.includes("<td>Bolt <b> & co</td>"));
});

test("POST /add adds the item and redirects to /", async function () {
  const res = await helpers.postAdd(app.url, { name: "Bolt", qty: "5", price: "275" });
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.get("location"), "/");
  assert.strictEqual(db.all().length, 1);
  assert.strictEqual(db.all()[0].name, "Bolt");
  assert.strictEqual(db.all()[0].qty, 5);
  assert.strictEqual(db.all()[0].price, 275);
});

test("POST /add without a name is refused with 400", async function () {
  const res = await helpers.postAdd(app.url, { qty: "5", price: "275" });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(await res.text(), "name required");
  assert.deepStrictEqual(db.all(), []);
});

test("POST /add coerces a non-numeric qty to 1 and a non-numeric price to 0", async function () {
  // Being lenient here is deliberate: this is a tool for one person typing
  // quickly, so a bad number is corrected rather than rejected.
  const res = await helpers.postAdd(app.url, { name: "Bolt", qty: "lots", price: "cheap" });
  assert.strictEqual(res.status, 302);
  assert.strictEqual(db.all()[0].qty, 1);
  assert.strictEqual(db.all()[0].price, 0);
});

test("GET /delete removes the row and redirects to /", async function () {
  const bolt = db.add("Bolt", 5, 275);
  const nut = db.add("Nut", 2, 50);
  const res = await fetch(app.url + "/delete?id=" + bolt.id, { redirect: "manual" });
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.get("location"), "/");
  assert.strictEqual(db.all().length, 1);
  assert.strictEqual(db.all()[0].id, nut.id);
});

test("GET /delete without an id is refused with 400", async function () {
  db.add("Bolt", 5, 275);
  const res = await fetch(app.url + "/delete", { redirect: "manual" });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(await res.text(), "id required");
  assert.strictEqual(db.all().length, 1);
});

test("GET /export returns CSV with the download headers and no dollar signs", async function () {
  const bolt = db.add("Bolt", 5, 275);
  const res = await fetch(app.url + "/export");
  const body = await res.text();
  assert.strictEqual(res.status, 200);
  assert.match(res.headers.get("content-type"), /^text\/csv/);
  assert.strictEqual(res.headers.get("content-disposition"), 'attachment; filename="stock.csv"');
  assert.strictEqual(body, "id,name,qty,price\n" + bolt.id + ",Bolt,5,2.75\n");
});

test("GET /report shows lines, units and value", async function () {
  db.add("Widget", 3, 1250);
  db.add("Gasket", 12, 499);
  db.add("Flange", 1, 19999);
  const res = await fetch(app.url + "/report");
  const body = await res.text();
  assert.strictEqual(res.status, 200);
  assert.match(body, /<h1>Report<\/h1>/);
  assert.match(body, /<p>lines: 3<\/p>/);
  assert.match(body, /<p>units: 16<\/p>/);
  assert.match(body, /<p>value: \$297\.37<\/p>/);
  assert.match(body, /<a href="\/">back<\/a>/);
});

test("an unknown URL is a 404", async function () {
  const res = await fetch(app.url + "/nope");
  assert.strictEqual(res.status, 404);
});
