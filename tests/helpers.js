// Shared setup for the test files. Not a test file itself: node --test only
// picks up tests/*.test.js, so this is required, never run.
const db = require("../src/db");

// src/db.js holds `items` and `nextId` in module scope and exposes no reset,
// so a test file empties the store through the public API instead. Ids are
// never reused, which is why nothing below may hardcode one.
function clearDb() {
  const items = db.all();
  const ids = [];
  for (let i = 0; i < items.length; i++) {
    ids.push(items[i].id);
  }
  for (let i = 0; i < ids.length; i++) {
    db.remove(ids[i]);
  }
}

// Starts the real express app from src/server.js on an ephemeral port, using
// the `module.exports = app` seam that file already has. Returns the base URL
// and a stop function.
function startApp() {
  const app = require("../src/server");
  return new Promise(function (resolve) {
    const server = app.listen(0, "127.0.0.1", function () {
      resolve({
        url: "http://127.0.0.1:" + server.address().port,
        stop: function () {
          return new Promise(function (done) {
            server.close(done);
          });
        },
      });
    });
  });
}

// POST /add the way the add form does: urlencoded, no redirect following.
function postAdd(url, fields) {
  return fetch(url + "/add", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields).toString(),
    redirect: "manual",
  });
}

module.exports = { clearDb: clearDb, startApp: startApp, postAdd: postAdd };
