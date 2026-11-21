// eslint.config.mjs is the only thing standing between src/ and nothing, so
// these check it still does what its own comment says: no-undef on src/*.js,
// with the commonjs globals this code actually uses.
var test = require("node:test");
var assert = require("node:assert/strict");
var path = require("node:path");
var ESLint = require("eslint").ESLint;

var root = path.dirname(__dirname);

function lint(code, file) {
  var eslint = new ESLint({ cwd: root, overrideConfigFile: "eslint.config.mjs" });
  return eslint.lintText(code, { filePath: path.join(root, file), warnIgnored: false }).then(function (results) {
    return results[0].messages;
  });
}

test("the commonjs globals src uses are not undefined", async function () {
  var messages = await lint(
    'var x = require("./x");\nconsole.log(process.env.PORT, __dirname);\nmodule.exports = { x: x };\n',
    "src/example.js"
  );
  assert.deepEqual(messages, []);
});

test("an undeclared name in src is a no-undef error", async function () {
  var messages = await lint("var y = nowhereDefined;\nmodule.exports = { y: y };\n", "src/example.js");
  assert.equal(messages.length, 1);
  assert.equal(messages[0].ruleId, "no-undef");
  assert.equal(messages[0].severity, 2);
});

test("es2020 syntax in src parses", async function () {
  var messages = await lint("var a = null;\nmodule.exports = { b: a ?? 1 };\n", "src/example.js");
  assert.deepEqual(messages, []);
});

test("nothing outside src is linted", async function () {
  var messages = await lint("var y = nowhereDefined;\n", "scripts/example.js");
  assert.deepEqual(messages, []);
});
