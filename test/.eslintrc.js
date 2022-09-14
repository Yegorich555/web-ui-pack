module.exports = {
  extends: ["plugin:jest/recommended"],
  plugins: ["jest"],
  globals: {
    unhandledReject: true,
  },
  rules: {
    "@typescript-eslint/no-var-requires": "off",
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/no-unused-vars": ["error", { varsIgnorePattern: "React" }],
    "@typescript-eslint/explicit-function-return-type": "off",
    "jsx-a11y/no-autofocus": "off",
    "no-param-reassign": "off",
    "no-promise-executor-return": "off",
    "jest/expect-expect": "off",
    "jest/no-commented-out-tests": "off",
    "no-return-assign": "off",
    "max-classes-per-file": "off",
    "prefer-promise-reject-errors": "off",
    "import/no-extraneous-dependencies": "off",
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
