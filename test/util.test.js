// tests for the pure helpers in src/util.js. no store, no request, no io.
var test = require("node:test");
var assert = require("node:assert");

var util = require("../src/util");

test("money formats integer cents as dollars with a sign", function () {
  assert.strictEqual(util.money(1250), "$12.50");
  assert.strictEqual(util.money(0), "$0.00");
  assert.strictEqual(util.money(5), "$0.05");
  assert.strictEqual(util.money(19999), "$199.99");
});

test("money2 is money without the dollar sign", function () {
  assert.strictEqual(util.money2(1250), "12.50");
  assert.strictEqual(util.money2(0), "0.00");
  assert.strictEqual(util.money2(5), "0.05");
});

test("money and money2 agree on every amount", function () {
  var amounts = [0, 1, 99, 100, 275, 19999];
  for (var i = 0; i < amounts.length; i++) {
    assert.strictEqual(util.money(amounts[i]), "$" + util.money2(amounts[i]));
  }
});

test("total is the sum of qty times price, in cents", function () {
  var list = [
    { qty: 3, price: 1250 },
    { qty: 12, price: 499 },
    { qty: 1, price: 19999 }
  ];
  assert.strictEqual(util.total(list), 29737);
});

test("total of a line is qty times price, not price", function () {
  assert.strictEqual(util.total([{ qty: 5, price: 275 }]), 1375);
});

test("total of an empty list is zero", function () {
  assert.strictEqual(util.total([]), 0);
});

test("esc escapes the three characters it knows about", function () {
  assert.strictEqual(util.esc("Bolt & Nut"), "Bolt &amp; Nut");
  assert.strictEqual(util.esc("<script>"), "&lt;script&gt;");
});

test("esc escapes the ampersand first, so nothing is escaped twice", function () {
  assert.strictEqual(util.esc("<&>"), "&lt;&amp;&gt;");
});

test("esc leaves quotes alone, so it is not safe for an attribute value", function () {
  assert.strictEqual(util.esc('a "b" c'), 'a "b" c');
});

test("esc turns null and undefined into the empty string", function () {
  assert.strictEqual(util.esc(null), "");
  assert.strictEqual(util.esc(undefined), "");
});

test("esc stringifies whatever it is given", function () {
  assert.strictEqual(util.esc(5), "5");
  assert.strictEqual(util.esc(0), "0");
});

test("pad zero-pads a single digit and leaves the rest", function () {
  assert.strictEqual(util.pad(0), "00");
  assert.strictEqual(util.pad(9), "09");
  assert.strictEqual(util.pad(10), "10");
  assert.strictEqual(util.pad(31), "31");
});
