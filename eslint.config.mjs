// What this project had before the factory arrived: almost nothing turned on.
// Setup records a per-file baseline for every rule that still has violations,
// and gardening clears them in small verified PRs.
//
// The rules below come from .factory/rules/javascript.yaml. Each one was
// checked against that pack's own `bad` and `good` example with this config
// before it was turned on. Nothing is autofixed here and no existing
// violation was touched: the static gate records a per-file baseline and
// gardening lowers it.
export default [
  {
    files: ["src/**/*.js"],
    languageOptions: {
      // ecmaVersion raised from 2020 to 2022 to match the rule pack's
      // base_config, so that code gardening modernises cannot fail to parse.
      ecmaVersion: 2022,
      sourceType: "commonjs",
      // Extended with the rest of the pack's base_config globals. Without
      // `exports`, `__filename`, `Buffer` and the timers, `no-undef` fires on
      // correct CommonJS and would block a legitimate change.
      globals: {
        require: "readonly",
        module: "writable",
        exports: "writable",
        process: "readonly",
        console: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        Buffer: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
      },
    },
    rules: {
      // Pre-existing.
      "no-undef": "error",

      // .factory/rules/javascript.yaml
      "no-var": "error",
      eqeqeq: ["error", "always"],
      "no-unused-vars": "error",
      "no-console": "error",
      "no-fallthrough": "error",
      "no-dupe-keys": "error",
      "require-atomic-updates": "error",
    },
  },
];
