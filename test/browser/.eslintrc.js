module.exports = {
  globals: {
    page: true,
    browser: true,
    context: true,
    jestPuppeteer: true,
    renderIt: true,
  },
  rules: {
    "jsx-a11y/label-has-associated-control": "off",
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
