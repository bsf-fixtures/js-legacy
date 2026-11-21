var test = require("node:test");
var assert = require("node:assert");
var util = require("../src/util");

test("money renders integer cents as dollars with a sign", function () {
  assert.strictEqual(util.money(0), "$0.00");
  assert.strictEqual(util.money(5), "$0.05");
  assert.strictEqual(util.money(1250), "$12.50");
  assert.strictEqual(util.money(19999), "$199.99");
});

test("money2 is money without the sign, for the csv", function () {
  assert.strictEqual(util.money2(0), "0.00");
  assert.strictEqual(util.money2(5), "0.05");
  assert.strictEqual(util.money2(1250), "12.50");
  assert.strictEqual(util.money2(19999), "199.99");
});

test("money and money2 differ only by the dollar sign", function () {
  var cents = [0, 1, 99, 100, 1250, 19999];
  for (var i = 0; i < cents.length; i++) {
    assert.strictEqual(util.money(cents[i]), "$" + util.money2(cents[i]));
  }
});

test("total sums qty times price, not price", function () {
  assert.strictEqual(util.total([]), 0);
  assert.strictEqual(util.total([{ qty: 5, price: 275 }]), 1375);
  assert.strictEqual(
    util.total([
      { qty: 3, price: 1250 },
      { qty: 12, price: 499 },
      { qty: 1, price: 19999 }
    ]),
    29737
  );
});

test("total of a zero qty line contributes nothing", function () {
  assert.strictEqual(util.total([{ qty: 0, price: 19999 }]), 0);
});

test("esc escapes the three html characters it knows about", function () {
  assert.strictEqual(util.esc("&"), "&amp;");
  assert.strictEqual(util.esc("<"), "&lt;");
  assert.strictEqual(util.esc(">"), "&gt;");
  assert.strictEqual(util.esc("<script>alert(1)</script>"), "&lt;script&gt;alert(1)&lt;/script&gt;");
});

test("esc escapes the ampersand first, so output is not double escaped", function () {
  assert.strictEqual(util.esc("&lt;"), "&amp;lt;");
  assert.strictEqual(util.esc("a & <b>"), "a &amp; &lt;b&gt;");
});

test("esc leaves quotes alone, so it is not safe for an attribute value", function () {
  assert.strictEqual(util.esc('say "hi"'), 'say "hi"');
  assert.strictEqual(util.esc("it's"), "it's");
});

test("esc turns null and undefined into the empty string", function () {
  assert.strictEqual(util.esc(null), "");
  assert.strictEqual(util.esc(undefined), "");
});

test("esc stringifies anything that is not a string", function () {
  assert.strictEqual(util.esc(0), "0");
  assert.strictEqual(util.esc(42), "42");
  assert.strictEqual(util.esc(false), "false");
});

test("pad zero-fills a single digit and leaves the rest", function () {
  assert.strictEqual(util.pad(0), "00");
  assert.strictEqual(util.pad(9), "09");
  assert.strictEqual(util.pad(10), "10");
  assert.strictEqual(util.pad(99), "99");
});
