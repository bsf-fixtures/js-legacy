// in-memory store. was going to move this to a real db but never did
var items = [];
var nextId = 1;

function all() {
  return items;
}

function add(name, qty, price) {
  var it = { id: nextId, name: name, qty: qty, price: price, created: new Date().toString() };
  nextId = nextId + 1;
  items.push(it);
  return it;
}

function find(id) {
  for (var i = 0; i < items.length; i++) {
    if (items[i].id == id) {
      return items[i];
    }
  }
  return null;
}

function remove(id) {
  var out = [];
  for (var i = 0; i < items.length; i++) {
    if (items[i].id != id) {
      out.push(items[i]);
    }
  }
  items = out;
}

module.exports = { all: all, add: add, find: find, remove: remove };
