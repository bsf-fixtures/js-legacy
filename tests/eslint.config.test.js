// what eslint.config.mjs actually does, checked against eslint itself rather
// than read off the file. the static gate drives `eslint src`, so these are
// the properties of the config that gate depends on.

var test = require("node:test");
var assert = require("node:assert");
var path = require("node:path");
var ESLint = require("eslint").ESLint;

var root = path.join(__dirname, "..");

// a path under src/ that need not exist: lintText picks the config block by
// the file path, and src/**/*.js is the only block there is.
var probe = path.join(root, "src", "probe.js");

function lint(code) {
  var eslint = new ESLint({
    cwd: root,
    overrideConfigFile: path.join(root, "eslint.config.mjs"),
  });
  return eslint.lintText(code, { filePath: probe }).then(function (results) {
    return results[0].messages;
  });
}

test("the commonjs globals src/ uses are defined", async function () {
  var messages = await lint(
    'var x = require("./x");\n' +
      "console.log(__dirname);\n" +
      "module.exports = { x: x, port: process.env.PORT };\n"
  );
  assert.deepStrictEqual(messages, []);
});

test("an identifier nothing declares is a no-undef error", async function () {
  var messages = await lint("var y = nowhereDefined;\nmodule.exports = y;\n");
  assert.strictEqual(messages.length, 1);
  assert.strictEqual(messages[0].ruleId, "no-undef");
  assert.strictEqual(messages[0].severity, 2);
});

test("src/ is parsed as es2020", async function () {
  var messages = await lint(
    "var a = {};\nvar b = a?.b ?? 1;\nmodule.exports = b;\n"
  );
  assert.deepStrictEqual(messages, []);
});

test("the config only applies to src/", async function () {
  var eslint = new ESLint({
    cwd: root,
    overrideConfigFile: path.join(root, "eslint.config.mjs"),
  });
  var results = await eslint.lintText("var z = nowhereDefined;\n", {
    filePath: path.join(root, "outside.js"),
  });
  assert.deepStrictEqual(results[0].messages, []);
});
