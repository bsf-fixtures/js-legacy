const test = require("node:test");
const assert = require("node:assert");
const util = require("../src/util");

test("money formats integer cents as dollars with a sign", function () {
  assert.strictEqual(util.money(0), "$0.00");
  assert.strictEqual(util.money(5), "$0.05");
  assert.strictEqual(util.money(275), "$2.75");
  assert.strictEqual(util.money(1250), "$12.50");
  assert.strictEqual(util.money(19999), "$199.99");
});

test("money2 is money without the dollar sign", function () {
  assert.strictEqual(util.money2(0), "0.00");
  assert.strictEqual(util.money2(275), "2.75");
  assert.strictEqual(util.money2(19999), "199.99");
});

test("total sums qty times price, not price", function () {
  assert.strictEqual(util.total([]), 0);
  assert.strictEqual(util.total([{ qty: 5, price: 275 }]), 1375);
  assert.strictEqual(
    util.total([
      { qty: 3, price: 1250 },
      { qty: 12, price: 499 },
      { qty: 1, price: 19999 },
    ]),
    29737
  );
});

test("total stays in integer cents", function () {
  const t = util.total([{ qty: 3, price: 1250 }]);
  assert.strictEqual(t, 3750);
  assert.ok(Number.isInteger(t));
});

test("esc escapes the three HTML characters it handles", function () {
  assert.strictEqual(util.esc("Bolt"), "Bolt");
  assert.strictEqual(util.esc("nuts & bolts"), "nuts &amp; bolts");
  assert.strictEqual(util.esc("<script>"), "&lt;script&gt;");
  assert.strictEqual(util.esc("a <b> & <c>"), "a &lt;b&gt; &amp; &lt;c&gt;");
});

test("esc turns null and undefined into the empty string", function () {
  assert.strictEqual(util.esc(null), "");
  assert.strictEqual(util.esc(undefined), "");
});

test("esc stringifies non-strings", function () {
  assert.strictEqual(util.esc(12), "12");
  assert.strictEqual(util.esc(0), "0");
});

test("pad left-pads single digits to two characters", function () {
  assert.strictEqual(util.pad(0), "00");
  assert.strictEqual(util.pad(9), "09");
  assert.strictEqual(util.pad(10), "10");
  assert.strictEqual(util.pad(99), "99");
});
