// shared test helpers. the store is module state, so every test file clears it
// between cases rather than assuming a fresh process.
var db = require("../src/db");

// db.remove reassigns the array, so iterate over a copy of the ids.
function reset() {
  var items = db.all();
  var ids = [];
  for (var i = 0; i < items.length; i++) {
    ids.push(items[i].id);
  }
  for (var j = 0; j < ids.length; j++) {
    db.remove(ids[j]);
  }
}

// the slice of express's res that src/ actually uses: send, status, redirect
// and setHeader. records what the handler did instead of writing a response.
function fakeRes() {
  var res = {
    statusCode: 200,
    body: null,
    headers: {},
    redirectedTo: null
  };
  res.status = function (code) {
    res.statusCode = code;
    return res;
  };
  res.send = function (body) {
    res.body = body;
    return res;
  };
  res.setHeader = function (name, value) {
    res.headers[name] = value;
    return res;
  };
  res.redirect = function (url) {
    res.statusCode = 302;
    res.redirectedTo = url;
    return res;
  };
  return res;
}

module.exports = { reset: reset, fakeRes: fakeRes };
