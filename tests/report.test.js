// src/report.js over HTTP: the /report page and the totals behind it.
var test = require("node:test");
var assert = require("node:assert");
var helper = require("./helpers/app");

// the runbook's seed trio, and the numbers it says they produce.
var SEED = [
  { name: "Widget", qty: "3", price: "1250" },
  { name: "Gasket", qty: "12", price: "499" },
  { name: "Flange", qty: "1", price: "19999" }
];

async function started(t) {
  var app = await helper.start();
  t.after(function () {
    return app.stop();
  });
  return app;
}

test("GET /report on an empty store reports zero lines, units and value", async function (t) {
  var app = await started(t);

  var res = await app.get("/report");
  var body = await res.text();

  assert.strictEqual(res.status, 200);
  assert.match(body, /<h1>Report<\/h1>/);
  assert.match(body, /<p>lines: 0<\/p>/);
  assert.match(body, /<p>units: 0<\/p>/);
  assert.match(body, /<p>value: \$0\.00<\/p>/);
  assert.match(body, /<a href="\/">back<\/a>/);
});

test("GET /report counts lines, sums units and values the stock", async function (t) {
  var app = await started(t);
  await helper.seed(app, SEED);

  var body = await (await app.get("/report")).text();

  assert.match(body, /<p>lines: 3<\/p>/);
  assert.match(body, /<p>units: 16<\/p>/);
  assert.match(body, /<p>value: \$297\.37<\/p>/);
});

test("lines counts rows while units sums qty", async function (t) {
  var app = await started(t);
  await helper.seed(app, [{ name: "Bolt", qty: "5", price: "275" }]);

  var body = await (await app.get("/report")).text();

  assert.match(body, /<p>lines: 1<\/p>/);
  assert.match(body, /<p>units: 5<\/p>/);
  assert.match(body, /<p>value: \$13\.75<\/p>/);
});

test("the report's value agrees with the total on /", async function (t) {
  var app = await started(t);
  await helper.seed(app, SEED);

  var home = await (await app.get("/")).text();
  var report = await (await app.get("/report")).text();

  // report.totals and util.total are separate implementations of the same
  // sum. they must not drift.
  assert.match(home, /<p>total: \$297\.37<\/p>/);
  assert.match(report, /<p>value: \$297\.37<\/p>/);
});

test("a deleted line leaves the report", async function (t) {
  var app = await started(t);
  await helper.seed(app, SEED);

  await app.get("/delete?id=3");

  var body = await (await app.get("/report")).text();
  assert.match(body, /<p>lines: 2<\/p>/);
  assert.match(body, /<p>units: 15<\/p>/);
  assert.match(body, /<p>value: \$97\.38<\/p>/);
});
