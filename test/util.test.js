// tests for src/util.js, the only shared module. these describe what the
// helpers do today, not what they should do: anything surprising in here is
// recorded as current behaviour so a later change has to be deliberate.

const test = require("node:test");
const assert = require("node:assert");

const util = require("../src/util.js");

test("money formats integer cents as dollars with a sign", () => {
  assert.strictEqual(util.money(1250), "$12.50");
  assert.strictEqual(util.money(0), "$0.00");
  assert.strictEqual(util.money(1), "$0.01");
  assert.strictEqual(util.money(19999), "$199.99");
});

test("money keeps the sign in front of a negative amount", () => {
  assert.strictEqual(util.money(-500), "$-5.00");
});

test("money2 is money without the dollar sign", () => {
  assert.strictEqual(util.money2(1250), "12.50");
  assert.strictEqual(util.money2(0), "0.00");
  assert.strictEqual(util.money2(499), "4.99");
});

test("total sums qty x price, not price", () => {
  const list = [
    { qty: 3, price: 1250 },
    { qty: 12, price: 499 },
    { qty: 1, price: 19999 },
  ];
  assert.strictEqual(util.total(list), 29737);
});

test("total of an empty list is zero", () => {
  assert.strictEqual(util.total([]), 0);
});

test("total stays in integer cents", () => {
  assert.strictEqual(util.total([{ qty: 2, price: 1 }]), 2);
});

test("esc escapes the three HTML characters it knows about", () => {
  assert.strictEqual(util.esc("a&b<c>d"), "a&amp;b&lt;c&gt;d");
  assert.strictEqual(util.esc("<script>"), "&lt;script&gt;");
});

test("esc escapes the ampersand first, so an entity is not double escaped away", () => {
  assert.strictEqual(util.esc("&amp;"), "&amp;amp;");
});

test("esc leaves quotes alone, so it is not safe for an attribute value", () => {
  assert.strictEqual(util.esc('say "hi"'), 'say "hi"');
  assert.strictEqual(util.esc("it's"), "it's");
});

test("esc turns null and undefined into an empty string", () => {
  assert.strictEqual(util.esc(null), "");
  assert.strictEqual(util.esc(undefined), "");
});

test("esc stringifies whatever it is given", () => {
  assert.strictEqual(util.esc(42), "42");
  assert.strictEqual(util.esc(0), "0");
  assert.strictEqual(util.esc(false), "false");
  assert.strictEqual(util.esc(""), "");
});

test("pad zero pads a single digit and returns a string", () => {
  assert.strictEqual(util.pad(0), "00");
  assert.strictEqual(util.pad(9), "09");
});

test("pad leaves anything already two digits or more", () => {
  assert.strictEqual(util.pad(10), "10");
  assert.strictEqual(util.pad(123), "123");
});
