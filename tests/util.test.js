var test = require("node:test");
var assert = require("node:assert");
var util = require("../src/util");

test("money renders integer cents as dollars with a sign", function () {
  assert.strictEqual(util.money(1250), "$12.50");
  assert.strictEqual(util.money(0), "$0.00");
  assert.strictEqual(util.money(5), "$0.05");
  assert.strictEqual(util.money(19999), "$199.99");
});

test("money2 is money without the dollar sign, for the csv", function () {
  assert.strictEqual(util.money2(1250), "12.50");
  assert.strictEqual(util.money2(0), "0.00");
  assert.strictEqual(util.money2(19999), "199.99");
});

test("total sums qty times price, not price", function () {
  var items = [
    { qty: 3, price: 1250 },
    { qty: 12, price: 499 },
    { qty: 1, price: 19999 },
  ];
  assert.strictEqual(util.total(items), 3 * 1250 + 12 * 499 + 1 * 19999);
});

test("total of nothing is zero", function () {
  assert.strictEqual(util.total([]), 0);
});

test("total stays in integer cents", function () {
  var t = util.total([{ qty: 3, price: 333 }]);
  assert.strictEqual(t, 999);
  assert.strictEqual(Number.isInteger(t), true);
});

test("esc escapes the three html characters it handles", function () {
  assert.strictEqual(util.esc("<b>"), "&lt;b&gt;");
  assert.strictEqual(util.esc("a & b"), "a &amp; b");
  assert.strictEqual(util.esc("<script>alert(1)</script>"), "&lt;script&gt;alert(1)&lt;/script&gt;");
});

test("esc escapes the ampersand before the angle brackets", function () {
  // if the order were reversed, "<" would become "&amp;lt;" and render as
  // literal "&lt;" instead of "<".
  assert.strictEqual(util.esc("&lt;"), "&amp;lt;");
});

test("esc does not escape quotes, so it is not safe for an attribute value", function () {
  // current behaviour, and the reason href="/delete?id=..." is only safe
  // while the id is a number.
  assert.strictEqual(util.esc('say "hi"'), 'say "hi"');
  assert.strictEqual(util.esc("it's"), "it's");
});

test("esc turns null and undefined into the empty string", function () {
  assert.strictEqual(util.esc(null), "");
  assert.strictEqual(util.esc(undefined), "");
});

test("esc stringifies what it is given", function () {
  assert.strictEqual(util.esc(5), "5");
  assert.strictEqual(util.esc(0), "0");
  assert.strictEqual(util.esc(false), "false");
});

test("pad zero-fills a single digit", function () {
  assert.strictEqual(util.pad(0), "00");
  assert.strictEqual(util.pad(9), "09");
  assert.strictEqual(util.pad(10), "10");
  assert.strictEqual(util.pad(123), "123");
});
