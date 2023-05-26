module.exports = {
  globals: {
    DEV: true,
  },
  rules: {
    "react/destructuring-assignment": "off",
  },
  settings: {
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true, // always try to resolve types under `<root>@types` directory even it doesn't contain any source code, like `@types/unist`
        project: ["./demo/tsconfig.json"],
      },
    },
  },
};
