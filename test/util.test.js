var test = require("node:test");
var assert = require("node:assert");
var util = require("../src/util");

test("money2 renders cents as a plain amount", function () {
  assert.strictEqual(util.money2(0), "0.00");
  assert.strictEqual(util.money2(5), "0.05");
  assert.strictEqual(util.money2(1250), "12.50");
  assert.strictEqual(util.money2(19999), "199.99");
});

test("money is money2 with a dollar sign", function () {
  var cents = [0, 5, 1250, 19999];
  for (var i = 0; i < cents.length; i++) {
    assert.strictEqual(util.money(cents[i]), "$" + util.money2(cents[i]));
  }
  assert.strictEqual(util.money(1250), "$12.50");
});

test("total sums qty times price in cents", function () {
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
