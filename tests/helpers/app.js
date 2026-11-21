// starts the real express app on an ephemeral port, with an empty store.
//
// the store is two module-level variables in src/db.js, so a fresh app means
// dropping src/ out of the require cache first. src/server.js only listens
// under require.main === module, which is what makes this possible at all.
var path = require("path");

var SRC = ["server.js", "handlers.js", "report.js", "db.js", "util.js"];

function fresh() {
  var dir = path.join(__dirname, "..", "..", "src");
  for (var i = 0; i < SRC.length; i++) {
    delete require.cache[require.resolve(path.join(dir, SRC[i]))];
  }
  return require(path.join(dir, "server.js"));
}

function client(server) {
  var base = "http://127.0.0.1:" + server.address().port;

  // redirect: manual, because every mutation here answers 302 and following
  // it would hide the status the handler actually sent.
  function get(p) {
    return fetch(base + p, { redirect: "manual" });
  }

  function post(p, fields) {
    return fetch(base + p, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(fields).toString(),
      redirect: "manual"
    });
  }

  function stop() {
    return new Promise(function (resolve) {
      server.close(function () {
        resolve();
      });
    });
  }

  return { get: get, post: post, stop: stop };
}

function start() {
  var app = fresh();
  return new Promise(function (resolve) {
    var server = app.listen(0, "127.0.0.1", function () {
      resolve(client(server));
    });
  });
}

// adds items through POST /add, the only way data gets in.
function seed(app, rows) {
  var chain = Promise.resolve();
  for (var i = 0; i < rows.length; i++) {
    chain = chain.then(nextAdd(rows[i]));
  }
  return chain;

  function nextAdd(row) {
    return function () {
      return app.post("/add", row);
    };
  }
}

module.exports = { start: start, seed: seed };
