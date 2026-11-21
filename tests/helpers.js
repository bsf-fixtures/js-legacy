// shared test setup. the store is module state, so every test resets it first.
var app = require("../src/server");
var db = require("../src/db");

// port 0 lets the os pick a free one, so tests never collide with the app
// running on PORT.
function start() {
  return new Promise(function (resolve) {
    var server = app.listen(0, "127.0.0.1", function () {
      resolve({ server: server, url: "http://127.0.0.1:" + server.address().port });
    });
  });
}

function stop(h) {
  return new Promise(function (resolve) {
    h.server.close(function () {
      resolve();
    });
  });
}

// db has no reset: ids keep climbing for the life of the process, so a test
// must use the ids add() hands back rather than assuming 1.
function reset() {
  var items = db.all().slice();
  for (var i = 0; i < items.length; i++) {
    db.remove(items[i].id);
  }
}

function form(fields) {
  return new URLSearchParams(fields).toString();
}

function post(url, fields) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form(fields),
    redirect: "manual",
  });
}

function get(url) {
  return fetch(url, { redirect: "manual" });
}

module.exports = { start: start, stop: stop, reset: reset, post: post, get: get };
