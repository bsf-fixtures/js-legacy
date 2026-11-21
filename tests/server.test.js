// src/server.js: the route table, the body parser and the listen guard.
var test = require("node:test");
var assert = require("node:assert");
var path = require("path");
var execFile = require("child_process").execFile;
var helper = require("./helpers/app");

var ROOT = path.join(__dirname, "..");

async function started(t) {
  var app = await helper.start();
  t.after(function () {
    return app.stop();
  });
  return app;
}

test("every url in the route table is wired to a handler", async function (t) {
  var app = await started(t);

  var routed = [
    { what: "GET /", res: await app.get("/"), status: 200 },
    { what: "GET /report", res: await app.get("/report"), status: 200 },
    { what: "GET /export", res: await app.get("/export"), status: 200 },
    { what: "GET /health", res: await app.get("/health"), status: 200 },
    { what: "GET /delete", res: await app.get("/delete?id=1"), status: 302 },
    { what: "POST /add", res: await app.post("/add", { name: "Bolt" }), status: 302 }
  ];

  for (var i = 0; i < routed.length; i++) {
    assert.strictEqual(routed[i].res.status, routed[i].status, routed[i].what);
  }
});

test("a url outside the table is a 404", async function (t) {
  var app = await started(t);

  assert.strictEqual((await app.get("/nope")).status, 404);
});

test("the routes are bound to one method each", async function (t) {
  var app = await started(t);

  // /add is a post and the rest are gets; the wrong verb is not routed.
  assert.strictEqual((await app.get("/add")).status, 404);
  assert.strictEqual((await app.post("/", {})).status, 404);
  assert.strictEqual((await app.post("/delete", { id: "1" })).status, 404);
});

test("the urlencoded body parser is wired, so a form post is read", async function (t) {
  var app = await started(t);

  await app.post("/add", { name: "Bolt", qty: "5", price: "275" });

  // without express.urlencoded, req.body.name is undefined and this is a 400
  assert.match(await (await app.get("/")).text(), /<td>Bolt<\/td><td>5<\/td><td>\$2\.75<\/td>/);
});

test("requiring the app does not bind a port", function (t, done) {
  // the require.main === module guard is the testing seam everything above
  // leans on: if it stopped working this child would listen and never exit.
  execFile(
    process.execPath,
    ["-e", 'require("./src/server")'],
    { cwd: ROOT, timeout: 1e4 },
    function (err, stdout) {
      assert.ifError(err);
      assert.strictEqual(stdout.trim(), "", "the app logged a startup line");
      done();
    }
  );
});

test("the app module is exported for callers that want to drive it", function () {
  var app = require(path.join(ROOT, "src", "server.js"));

  assert.strictEqual(typeof app.listen, "function");
});
