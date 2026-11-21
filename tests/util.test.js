const test = require("node:test");
const assert = require("node:assert");
const util = require("../src/util");

test("money renders integer cents as dollars with a sign", function () {
  assert.strictEqual(util.money(1250), "$12.50");
  assert.strictEqual(util.money(0), "$0.00");
  assert.strictEqual(util.money(5), "$0.05");
  assert.strictEqual(util.money(19999), "$199.99");
});

test("money2 is money without the dollar sign, for the csv", function () {
  assert.strictEqual(util.money2(1250), "12.50");
  assert.strictEqual(util.money2(0), "0.00");
  assert.strictEqual(util.money2(5), "0.05");
});

test("total sums qty x price, not price", function () {
  const list = [
    { qty: 3, price: 1250 },
    { qty: 12, price: 499 },
    { qty: 1, price: 19999 },
  ];
  assert.strictEqual(util.total(list), 3 * 1250 + 12 * 499 + 1 * 19999);
});

test("total of an empty list is zero", function () {
  assert.strictEqual(util.total([]), 0);
});

test("esc escapes the three html characters it handles", function () {
  assert.strictEqual(util.esc("<b>&</b>"), "&lt;b&gt;&amp;&lt;/b&gt;");
  assert.strictEqual(util.esc("a & b"), "a &amp; b");
});

test("esc escapes the ampersand before the angle brackets", function () {
  // If the order were reversed the entities themselves would be re-escaped.
  assert.strictEqual(util.esc("<"), "&lt;");
  assert.strictEqual(util.esc("&lt;"), "&amp;lt;");
});

test("esc leaves quotes alone, so it is not safe for an attribute value", function () {
  assert.strictEqual(util.esc('say "hi"'), 'say "hi"');
  assert.strictEqual(util.esc("it's"), "it's");
});

test("esc turns null and undefined into the empty string", function () {
  assert.strictEqual(util.esc(null), "");
  assert.strictEqual(util.esc(undefined), "");
});

test("esc stringifies what it is given", function () {
  assert.strictEqual(util.esc(12), "12");
  assert.strictEqual(util.esc(0), "0");
  assert.strictEqual(util.esc(false), "false");
});

test("pad zero-fills a single digit and leaves the rest as a string", function () {
  assert.strictEqual(util.pad(0), "00");
  assert.strictEqual(util.pad(9), "09");
  assert.strictEqual(util.pad(10), "10");
  assert.strictEqual(util.pad(123), "123");
});
