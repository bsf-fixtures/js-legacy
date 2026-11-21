const test = require("node:test");
const assert = require("node:assert");
const app = require("../src/server");
const db = require("../src/db");
const util = require("../src/util");
const report = require("../src/report");
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

test("totals of an empty store is all zeros", function () {
  assert.deepStrictEqual(report.totals(), { value: 0, units: 0, lines: 0 });
});

test("totals counts lines, sums units and values at qty x price", function () {
  db.add("Widget", 3, 1250);
  db.add("Gasket", 12, 499);
  db.add("Flange", 1, 19999);
  assert.deepStrictEqual(report.totals(), {
    value: 3 * 1250 + 12 * 499 + 1 * 19999,
    units: 16,
    lines: 3,
  });
});

test("totals agrees with util.total, which is the other copy of the same sum", function () {
  db.add("Widget", 3, 1250);
  db.add("Gasket", 12, 499);
  db.add("Flange", 1, 19999);
  assert.strictEqual(report.totals().value, util.total(db.all()));
});

test("GET /report renders lines, units and the value in dollars", async function () {
  db.add("Widget", 3, 1250);
  db.add("Gasket", 12, 499);
  db.add("Flange", 1, 19999);
  const res = await fetch(base + "/report");
  const body = await res.text();
  assert.strictEqual(res.status, 200);
  assert.match(body, /<h1>Report<\/h1>/);
  assert.match(body, /<p>lines: 3<\/p>/);
  assert.match(body, /<p>units: 16<\/p>/);
  assert.match(body, /<p>value: \$297\.37<\/p>/);
  assert.match(body, /<a href="\/">back<\/a>/);
});

test("GET /report on an empty store shows zeros", async function () {
  const body = await (await fetch(base + "/report")).text();
  assert.match(body, /<p>lines: 0<\/p>/);
  assert.match(body, /<p>units: 0<\/p>/);
  assert.match(body, /<p>value: \$0\.00<\/p>/);
});

test("/report and / show the same total", async function () {
  db.add("Widget", 3, 1250);
  db.add("Gasket", 12, 499);
  const index = await (await fetch(base + "/")).text();
  const page = await (await fetch(base + "/report")).text();
  const onIndex = /total: (\$[\d.]+)/.exec(index)[1];
  const onReport = /<p>value: (\$[\d.]+)<\/p>/.exec(page)[1];
  assert.strictEqual(onReport, onIndex);
});
