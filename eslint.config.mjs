// What this project had before the factory arrived: almost nothing turned on.
// Setup records a per-file baseline for every rule that still has violations,
// and gardening clears them in small verified PRs.
export default [
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "commonjs",
      globals: { require: "readonly", module: "writable", process: "readonly", console: "readonly", __dirname: "readonly" },
    },
    rules: {
      "no-undef": "error",
    },
  },
];
