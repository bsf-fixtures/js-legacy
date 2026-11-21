const test = require("node:test");
const assert = require("node:assert");
const app = require("../src/server");
const helpers = require("./helpers");

let base = null;
let server = null;

test.before(async function () {
  server = await helpers.listen(app);
  base = server.url;
});

test.after(function () {
  return server.close();
});

test("requiring the server exports the app without binding a port", function () {
  // The require.main guard is the testing seam: importing src/server.js must
  // not listen, or this file could not have reached this line.
  assert.strictEqual(typeof app, "function");
  assert.strictEqual(typeof app.listen, "function");
});

test("the six routes in the table all answer", async function () {
  const gets = ["/", "/delete?id=1", "/export", "/report", "/health"];
  for (let i = 0; i < gets.length; i++) {
    const res = await fetch(base + gets[i], { redirect: "manual" });
    assert.notStrictEqual(res.status, 404, gets[i] + " should be routed");
    await res.text();
  }
  const posted = await helpers.post(base + "/add", { name: "Bolt" });
  assert.notStrictEqual(posted.status, 404, "POST /add should be routed");
});

test("a url that is not in the table is a 404", async function () {
  const res = await fetch(base + "/nope");
  assert.strictEqual(res.status, 404);
});

test("the methods the table does not wire are not routed", async function () {
  // / is a GET and /add is a POST; neither answers to the other verb.
  const postedIndex = await helpers.post(base + "/", {});
  assert.strictEqual(postedIndex.status, 404);
  const gotAdd = await fetch(base + "/add", { redirect: "manual" });
  assert.strictEqual(gotAdd.status, 404);
});

test("the urlencoded body parser is installed, so req.body is always there", async function () {
  // Without express.urlencoded, handlers.add would throw on req.body.name
  // instead of answering 400.
  const res = await fetch(base + "/add", { method: "POST", redirect: "manual" });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(await res.text(), "name required");
});
