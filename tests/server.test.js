var test = require("node:test");
var assert = require("node:assert");
var net = require("node:net");
var path = require("node:path");
var spawn = require("node:child_process").spawn;
var app = require("../src/server");
var helpers = require("./helpers");

var ENTRY = path.join(__dirname, "..", "src", "server.js");

// ask the os for a port, then let it go. the child binds it a moment later.
function freePort() {
  return new Promise(function (resolve) {
    var probe = net.createServer();
    probe.listen(0, "127.0.0.1", function () {
      var port = probe.address().port;
      probe.close(function () {
        resolve(port);
      });
    });
  });
}

function waitForLine(child, match) {
  return new Promise(function (resolve, reject) {
    var seen = "";
    var timer = setTimeout(function () {
      reject(new Error("server never logged " + match + ". saw: " + seen));
    }, 10000);
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", function (chunk) {
      seen += chunk;
      if (seen.indexOf(match) !== -1) {
        clearTimeout(timer);
        resolve(seen);
      }
    });
  });
}

test("requiring the module exports the express app without listening", function () {
  // the require.main guard is the testing seam: every other test in this
  // repo depends on importing server.js not binding a port.
  assert.strictEqual(typeof app, "function");
  assert.strictEqual(typeof app.listen, "function");
});

test("every route in the table is wired", async function () {
  var h = await helpers.start();
  try {
    var urls = ["/", "/delete?id=1", "/export", "/report", "/health"];
    for (var i = 0; i < urls.length; i++) {
      var res = await helpers.get(h.url + urls[i]);
      assert.notStrictEqual(res.status, 404, urls[i] + " is not wired");
    }
    var added = await helpers.post(h.url + "/add", { name: "Bolt", qty: "1", price: "1" });
    assert.notStrictEqual(added.status, 404, "POST /add is not wired");
  } finally {
    helpers.reset();
    await helpers.stop(h);
  }
});

test("a url that is not in the table is a 404", async function () {
  var h = await helpers.start();
  try {
    var res = await helpers.get(h.url + "/nope");
    assert.strictEqual(res.status, 404);
  } finally {
    await helpers.stop(h);
  }
});

test("GET on a post-only route is a 404", async function () {
  var h = await helpers.start();
  try {
    var res = await helpers.get(h.url + "/add");
    assert.strictEqual(res.status, 404);
  } finally {
    await helpers.stop(h);
  }
});

test("the urlencoded body parser is mounted, so form posts arrive parsed", async function () {
  var h = await helpers.start();
  try {
    // without express.urlencoded, req.body is undefined and handlers.add
    // throws rather than answering 400.
    var res = await helpers.post(h.url + "/add", { qty: "1" });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(await res.text(), "name required");
  } finally {
    helpers.reset();
    await helpers.stop(h);
  }
});

test("run directly, the server listens on PORT and says so", async function () {
  var port = await freePort();
  var child = spawn(process.execPath, [ENTRY], {
    env: Object.assign({}, process.env, { PORT: String(port) }),
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    await waitForLine(child, "listening on " + port);
    var res = await fetch("http://127.0.0.1:" + port + "/health");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(await res.text(), "ok");
  } finally {
    child.kill();
  }
});
