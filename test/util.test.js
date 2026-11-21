// what src/util.js does today. written to be read as the spec these helpers
// never had, so the surprising bits are asserted rather than left to luck.
var test = require("node:test");
var assert = require("node:assert");
var util = require("../src/util");

test("money renders cents as dollars with a sign", function () {
  assert.strictEqual(util.money(0), "$0.00");
  assert.strictEqual(util.money(5), "$0.05");
  assert.strictEqual(util.money(275), "$2.75");
  assert.strictEqual(util.money(1250), "$12.50");
  assert.strictEqual(util.money(19999), "$199.99");
});

test("money always shows two decimal places", function () {
  assert.strictEqual(util.money(100), "$1.00");
  assert.strictEqual(util.money(110), "$1.10");
  assert.strictEqual(util.money(1), "$0.01");
});

// the sign goes in front of the whole thing, so a negative reads "$-12.50"
// rather than "-$12.50". nothing produces a negative price today.
test("money puts the minus after the dollar sign", function () {
  assert.strictEqual(util.money(-1250), "$-12.50");
});

test("money2 is money without the dollar sign", function () {
  assert.strictEqual(util.money2(0), "0.00");
  assert.strictEqual(util.money2(275), "2.75");
  assert.strictEqual(util.money2(1250), "12.50");
  assert.strictEqual(util.money2(19999), "199.99");
  assert.strictEqual(util.money2(-1250), "-12.50");
});

test("total is zero for an empty list", function () {
  assert.strictEqual(util.total([]), 0);
});

// the one piece of domain arithmetic here: a line is worth qty x price,
// not price.
test("total sums qty times price, not price", function () {
  assert.strictEqual(util.total([{ qty: 3, price: 1250 }]), 3750);
  assert.strictEqual(util.total([{ qty: 1, price: 19999 }]), 19999);
});

test("total adds the lines up", function () {
  var items = [
    { qty: 3, price: 1250 },
    { qty: 12, price: 499 },
    { qty: 1, price: 19999 }
  ];
  assert.strictEqual(util.total(items), 29737);
  assert.strictEqual(util.money(util.total(items)), "$297.37");
});

test("total ignores every field but qty and price", function () {
  var items = [{ id: 7, name: "Widget", qty: 2, price: 100, created: "whenever" }];
  assert.strictEqual(util.total(items), 200);
});

test("total counts a zero qty as nothing", function () {
  assert.strictEqual(util.total([{ qty: 0, price: 19999 }]), 0);
});

test("esc turns an empty value into an empty string", function () {
  assert.strictEqual(util.esc(null), "");
  assert.strictEqual(util.esc(undefined), "");
});

// == null, so a falsy value that is not null still formats
test("esc keeps a zero rather than emptying it", function () {
  assert.strictEqual(util.esc(0), "0");
  assert.strictEqual(util.esc(""), "");
});

test("esc leaves ordinary text alone", function () {
  assert.strictEqual(util.esc("Bolt M6"), "Bolt M6");
});

test("esc escapes the three html characters it knows", function () {
  assert.strictEqual(util.esc("<script>"), "&lt;script&gt;");
  assert.strictEqual(util.esc("Smith & Sons"), "Smith &amp; Sons");
});

// ampersands are replaced first, so an escape it produced is not escaped again
test("esc does not double-escape its own output", function () {
  assert.strictEqual(util.esc("<&>"), "&lt;&amp;&gt;");
  assert.strictEqual(util.esc("&lt;"), "&amp;lt;");
});

// this is why esc is not enough for an attribute value: the href in
// handlers.index is only safe because the id it interpolates is a number.
test("esc leaves quotes alone, so it is not safe inside an attribute", function () {
  assert.strictEqual(util.esc('a "b" c'), 'a "b" c');
  assert.strictEqual(util.esc("a 'b' c"), "a 'b' c");
});

test("esc coerces a non-string to a string", function () {
  assert.strictEqual(util.esc(42), "42");
  assert.strictEqual(util.esc(true), "true");
});

test("pad zero-pads a single digit to two", function () {
  assert.strictEqual(util.pad(0), "00");
  assert.strictEqual(util.pad(7), "07");
  assert.strictEqual(util.pad(9), "09");
});

test("pad leaves anything already two digits or more", function () {
  assert.strictEqual(util.pad(10), "10");
  assert.strictEqual(util.pad(59), "59");
  assert.strictEqual(util.pad(100), "100");
});

test("pad returns a string", function () {
  assert.strictEqual(typeof util.pad(1), "string");
  assert.strictEqual(typeof util.pad(11), "string");
});
