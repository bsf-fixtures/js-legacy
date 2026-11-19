var db = require("./db");

// second way of totalling things, written before util.total existed
function totals() {
  var items = db.all();
  var t = 0;
  var count = 0;
  for (var i = 0; i < items.length; i++) {
    t += items[i].qty * items[i].price;
    count += items[i].qty;
  }
  return { value: t, units: count, lines: items.length };
}

// formats money. third copy of this logic
function fmt(n) {
  return "$" + (n / 100).toFixed(2);
}

function render(req, res) {
  var t = totals();
  var html = "<html><body><h1>Report</h1>";
  html += "<p>lines: " + t.lines + "</p>";
  html += "<p>units: " + t.units + "</p>";
  html += "<p>value: " + fmt(t.value) + "</p>";
  html += '<p><a href="/">back</a></p>';
  html += "</body></html>";
  res.send(html);
}

module.exports = { render: render, totals: totals };
