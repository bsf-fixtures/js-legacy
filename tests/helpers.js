// Shared test helpers. Not a test file itself: `node --test tests/` only
// picks up tests/*.test.js, so this is only ever loaded by a require.
const db = require("../src/db");

// Starts the app on an ephemeral port so tests never collide with a server
// already holding PORT. Returns the base url and a close function.
function listen(app) {
  return new Promise(function (resolve) {
    const server = app.listen(0, "127.0.0.1", function () {
      const url = "http://127.0.0.1:" + server.address().port;
      resolve({
        url: url,
        close: function () {
          return new Promise(function (done) {
            server.close(done);
          });
        },
      });
    });
  });
}

// The store is module state that outlives a test, and db exposes no reset.
// Removing every item is the only way back to the empty list; nextId keeps
// counting, which is why no test may assume an id.
function clear() {
  const items = db.all().slice();
  for (let i = 0; i < items.length; i++) {
    db.remove(items[i].id);
  }
}

// POST /add the way the form does: urlencoded, which is the only body
// parser the app installs.
function post(url, fields) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields).toString(),
    redirect: "manual",
  });
}

module.exports = { listen: listen, clear: clear, post: post };
