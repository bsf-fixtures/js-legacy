const test = require("node:test");
const assert = require("node:assert");
const app = require("../src/server");
const db = require("../src/db");
const helpers = require("./helpers");

let base = null;
let server = null;

test.before(async function () {
  server = await helpers.listen(app);
  base = server.url;
});

test.after(function () {
  return server.close();
});

test.beforeEach(helpers.clear);

test("GET / renders the empty stock page", async function () {
  const res = await fetch(base + "/");
  const body = await res.text();
  assert.strictEqual(res.status, 200);
  assert.match(body, /<h1>Stock<\/h1>/);
  assert.match(body, /<tr><td>id<\/td><td>name<\/td><td>qty<\/td><td>price<\/td>/);
  assert.match(body, /total: \$0\.00/);
  assert.match(body, /<form method="post" action="\/add">/);
  assert.match(body, /<a href="\/export">export csv<\/a>/);
});

test("GET / lists each item with its price in dollars and the qty x price total", async function () {
  db.add("Widget", 3, 1250);
  db.add("Gasket", 12, 499);
  const body = await (await fetch(base + "/")).text();
  assert.match(body, /<td>Widget<\/td><td>3<\/td><td>\$12\.50<\/td>/);
  assert.match(body, /<td>Gasket<\/td><td>12<\/td><td>\$4\.99<\/td>/);
  // 3 * 1250 + 12 * 499 = 9738, and not 1250 + 499.
  assert.match(body, /total: \$97\.38/);
});

test("GET / gives every row a delete link carrying its id", async function () {
  const it = db.add("Widget", 3, 1250);
  const body = await (await fetch(base + "/")).text();
  assert.ok(body.includes('<a href="/delete?id=' + it.id + '">delete</a>'));
});

test("GET / escapes the item name", async function () {
  db.add("<b>Bolt</b> & co", 1, 100);
  const body = await (await fetch(base + "/")).text();
  assert.match(body, /&lt;b&gt;Bolt&lt;\/b&gt; &amp; co/);
  assert.ok(!body.includes("<b>Bolt</b>"));
});

test("POST /add stores the item and redirects to /", async function () {
  const res = await helpers.post(base + "/add", { name: "Bolt", qty: "5", price: "275" });
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.get("location"), "/");
  const items = db.all();
  assert.strictEqual(items.length, 1);
  assert.strictEqual(items[0].name, "Bolt");
  assert.strictEqual(items[0].qty, 5);
  assert.strictEqual(items[0].price, 275);
});

test("POST /add without a name is refused with 400", async function () {
  const res = await helpers.post(base + "/add", { qty: "5", price: "275" });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(await res.text(), "name required");
  assert.strictEqual(db.all().length, 0);
});

test("POST /add with an empty name is refused too", async function () {
  const res = await helpers.post(base + "/add", { name: "", qty: "5", price: "275" });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(db.all().length, 0);
});

test("POST /add coerces a bad qty to 1 and a bad price to 0 rather than refusing", async function () {
  const res = await helpers.post(base + "/add", { name: "Bolt", qty: "lots", price: "cheap" });
  assert.strictEqual(res.status, 302);
  assert.strictEqual(db.all()[0].qty, 1);
  assert.strictEqual(db.all()[0].price, 0);
});

test("POST /add with qty and price missing gets the same fallbacks", async function () {
  await helpers.post(base + "/add", { name: "Bolt" });
  assert.strictEqual(db.all()[0].qty, 1);
  assert.strictEqual(db.all()[0].price, 0);
});

test("GET /delete removes the row and redirects to /", async function () {
  const a = db.add("Widget", 3, 1250);
  const b = db.add("Gasket", 12, 499);
  const res = await fetch(base + "/delete?id=" + a.id, { redirect: "manual" });
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.get("location"), "/");
  assert.deepStrictEqual(db.all(), [b]);
});

test("GET /delete without an id is refused with 400", async function () {
  db.add("Widget", 3, 1250);
  const res = await fetch(base + "/delete", { redirect: "manual" });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(await res.text(), "id required");
  assert.strictEqual(db.all().length, 1);
});

test("GET /export sends a csv attachment", async function () {
  db.add("Widget", 3, 1250);
  const res = await fetch(base + "/export");
  assert.strictEqual(res.status, 200);
  assert.match(res.headers.get("content-type"), /^text\/csv/);
  assert.strictEqual(res.headers.get("content-disposition"), 'attachment; filename="stock.csv"');
});

test("GET /export writes a header row and one row per item, with prices unsigned", async function () {
  const a = db.add("Widget", 3, 1250);
  const b = db.add("Gasket", 12, 499);
  const body = await (await fetch(base + "/export")).text();
  assert.strictEqual(
    body,
    "id,name,qty,price\n" +
      a.id + ",Widget,3,12.50\n" +
      b.id + ",Gasket,12,4.99\n"
  );
});

test("GET /export of an empty store is the header row alone", async function () {
  const body = await (await fetch(base + "/export")).text();
  assert.strictEqual(body, "id,name,qty,price\n");
});

test("GET /health returns ok", async function () {
  const res = await fetch(base + "/health");
  assert.strictEqual(res.status, 200);
  assert.strictEqual(await res.text(), "ok");
});
