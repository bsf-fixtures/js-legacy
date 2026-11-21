var test = require("node:test");
var assert = require("node:assert");
var util = require("../src/util");

test("util exports only the helpers something calls", function () {
  assert.deepStrictEqual(Object.keys(util).sort(), ["esc", "money", "money2", "total"]);
});

test("money formats cents as dollars with a sign", function () {
  assert.strictEqual(util.money(0), "$0.00");
  assert.strictEqual(util.money(275), "$2.75");
  assert.strictEqual(util.money(19999), "$199.99");
});

test("money2 formats cents as dollars without a sign", function () {
  assert.strictEqual(util.money2(0), "0.00");
  assert.strictEqual(util.money2(275), "2.75");
  assert.strictEqual(util.money2(19999), "199.99");
});

test("total sums qty times price over the list", function () {
  assert.strictEqual(util.total([]), 0);
  assert.strictEqual(util.total([{ qty: 5, price: 275 }]), 1375);
  assert.strictEqual(
    util.total([{ qty: 3, price: 1250 }, { qty: 12, price: 499 }, { qty: 1, price: 19999 }]),
    29737
  );
});

test("esc escapes the three characters it knows about", function () {
  assert.strictEqual(util.esc("Bolt"), "Bolt");
  assert.strictEqual(util.esc("<script>"), "&lt;script&gt;");
  assert.strictEqual(util.esc("Tom & Jerry"), "Tom &amp; Jerry");
  assert.strictEqual(util.esc("a & <b>"), "a &amp; &lt;b&gt;");
});

test("esc turns a missing value into the empty string and stringifies the rest", function () {
  assert.strictEqual(util.esc(null), "");
  assert.strictEqual(util.esc(undefined), "");
  assert.strictEqual(util.esc(12), "12");
});
