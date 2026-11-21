// helpers. pure functions over values: no db, no req/res

function money(n) {
  return "$" + money2(n);
}

function total(list) {
  var t = 0;
  for (var i = 0; i < list.length; i++) {
    t = t + list[i].qty * list[i].price;
  }
  return t;
}

// cents to a plain amount, no dollar sign. used in the csv, and by money()
function money2(n) {
  return (n / 100).toFixed(2);
}

function esc(s) {
  if (s == null) {
    return "";
  }
  s = String(s);
  s = s.replace(/&/g, "&amp;");
  s = s.replace(/</g, "&lt;");
  s = s.replace(/>/g, "&gt;");
  return s;
}

function pad(n) {
  if (n < 10) {
    return "0" + n;
  }
  return "" + n;
}

module.exports = { money: money, money2: money2, total: total, esc: esc, pad: pad };
