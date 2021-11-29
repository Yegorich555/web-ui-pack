module.exports = {
  globals: {
    page: true,
    browser: true,
    context: true,
    jestPuppeteer: true,
    renderIt: true,
  },
  settings: {
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true, // always try to resolve types under `<root>@types` directory even it doesn't contain any source code, like `@types/unist`
        project: ["./test/tsconfig.json"],
      },
    },
  },
};
