// covers src/util.js: the money formatters, the totaller, esc and pad.
var test = require("node:test");
var assert = require("node:assert");
var util = require("../src/util");

test("money renders cents as dollars with a sign", function () {
  assert.strictEqual(util.money(1250), "$12.50");
  assert.strictEqual(util.money(0), "$0.00");
  assert.strictEqual(util.money(19999), "$199.99");
  assert.strictEqual(util.money(5), "$0.05");
});

test("money2 is money without the sign, which is what the csv wants", function () {
  assert.strictEqual(util.money2(1250), "12.50");
  assert.strictEqual(util.money2(0), "0.00");
  assert.strictEqual(util.money2(19999), "199.99");
});

test("total sums qty times price, not price", function () {
  var list = [
    { qty: 3, price: 1250 },
    { qty: 12, price: 499 },
    { qty: 1, price: 19999 }
  ];
  assert.strictEqual(util.total(list), 3 * 1250 + 12 * 499 + 19999);
});

test("total of nothing is zero", function () {
  assert.strictEqual(util.total([]), 0);
});

test("esc escapes the three characters it handles", function () {
  assert.strictEqual(util.esc("<script>"), "&lt;script&gt;");
  assert.strictEqual(util.esc("a & b"), "a &amp; b");
  assert.strictEqual(util.esc("&<>"), "&amp;&lt;&gt;");
});

test("esc escapes the ampersand before the angle brackets, so entities are not doubled", function () {
  assert.strictEqual(util.esc("&lt;"), "&amp;lt;");
});

test("esc does not escape quotes, so it is not safe for an attribute value", function () {
  assert.strictEqual(util.esc('a "b" c'), 'a "b" c');
  assert.strictEqual(util.esc("it's"), "it's");
});

test("esc turns null and undefined into the empty string", function () {
  assert.strictEqual(util.esc(null), "");
  assert.strictEqual(util.esc(undefined), "");
});

test("esc stringifies whatever it is given", function () {
  assert.strictEqual(util.esc(12), "12");
  assert.strictEqual(util.esc(0), "0");
  assert.strictEqual(util.esc(false), "false");
});

test("pad zero-pads a single digit and leaves the rest alone", function () {
  assert.strictEqual(util.pad(0), "00");
  assert.strictEqual(util.pad(9), "09");
  assert.strictEqual(util.pad(10), "10");
  assert.strictEqual(util.pad(100), "100");
});
