var db = require("./db");
var util = require("./util");

// TODO: split this file up
function index(req, res) {
  var items = db.all();
  var html = "<html><head><title>Stock</title></head><body>";
  html = html + "<h1>Stock</h1>";
  html = html + "<table border=1>";
  html = html + "<tr><td>id</td><td>name</td><td>qty</td><td>price</td><td></td></tr>";
  for (var i = 0; i < items.length; i++) {
    html = html + "<tr>";
    html = html + "<td>" + items[i].id + "</td>";
    html = html + "<td>" + util.esc(items[i].name) + "</td>";
    html = html + "<td>" + items[i].qty + "</td>";
    html = html + "<td>" + util.money(items[i].price) + "</td>";
    html = html + '<td><a href="/delete?id=' + items[i].id + '">delete</a></td>';
    html = html + "</tr>";
  }
  html = html + "</table>";
  html = html + "<p>total: " + util.money(util.total(items)) + "</p>";
  html = html + '<form method="post" action="/add">';
  html = html + '<input name="name" placeholder="name">';
  html = html + '<input name="qty" placeholder="qty">';
  html = html + '<input name="price" placeholder="price in cents">';
  html = html + '<button type="submit">add</button>';
  html = html + "</form>";
  html = html + '<p><a href="/export">export csv</a></p>';
  html = html + "</body></html>";
  res.send(html);
}

function add(req, res) {
  var name = req.body.name;
  var qty = parseInt(req.body.qty, 10);
  var price = parseInt(req.body.price, 10);
  if (!name) {
    res.status(400).send("name required");
    return;
  }
  if (isNaN(qty)) {
    qty = 1;
  }
  if (isNaN(price)) {
    price = 0;
  }
  db.add(name, qty, price);
  res.redirect("/");
}

function del(req, res) {
  var id = req.query.id;
  if (!id) {
    res.status(400).send("id required");
    return;
  }
  db.remove(id);
  res.redirect("/");
}

// csv export. note: this does its own money formatting, see util.money2
function exportCsv(req, res) {
  var items = db.all();
  var out = "id,name,qty,price\n";
  for (var i = 0; i < items.length; i++) {
    out = out + items[i].id + "," + items[i].name + "," + items[i].qty + "," + util.money2(items[i].price) + "\n";
  }
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="stock.csv"');
  res.send(out);
}

function health(req, res) {
  res.send("ok");
}

module.exports = { index: index, add: add, del: del, exportCsv: exportCsv, health: health };
