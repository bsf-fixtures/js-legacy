var db = require("./db");
var util = require("./util");

function totals() {
  var items = db.all();
  var count = 0;
  for (var i = 0; i < items.length; i++) {
    count += items[i].qty;
  }
  return { value: util.total(items), units: count, lines: items.length };
}

function render(req, res) {
  var t = totals();
  var html = "<html><body><h1>Report</h1>";
  html += "<p>lines: " + t.lines + "</p>";
  html += "<p>units: " + t.units + "</p>";
  html += "<p>value: " + util.money(t.value) + "</p>";
  html += '<p><a href="/">back</a></p>';
  html += "</body></html>";
  res.send(html);
}

module.exports = { render: render, totals: totals };
