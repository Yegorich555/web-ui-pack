/*
tslint won't be supported: https://github.com/palantir/tslint/issues/4534
you should use typescript-eslint/eslint-plugin: https://github.com/typescript-eslint/typescript-eslint/tree/master/packages/eslint-plugin
but you can't do it with {parser: 'babel-eslint'}: https://github.com/typescript-eslint/typescript-eslint#what-about-babel-and-babel-eslint
*/
/** @type {import("eslint").Linter.Config} */
module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  extends: ["eslint:recommended", "airbnb", "prettier", "plugin:@typescript-eslint/recommended"],
  env: {
    es6: true,
    node: true,
    browser: true,
  },
  globals: {
    DEV: true,
  },
  plugins: ["json", "prettier", "import", "@typescript-eslint", "unused-imports"],
  rules: {
    "no-shadow": "off",
    "@typescript-eslint/no-shadow": "error",
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/explicit-function-return-type": "off",
    "import/no-extraneous-dependencies": "off",
    "lines-between-class-members": ["error", "always", { exceptAfterSingleLine: true }],
    "react/no-access-state-in-setstate": "off",
    "react/react-in-jsx-scope": "off",
    "react/jsx-filename-extension": [1, { extensions: [".tsx", ".jsx"] }],
    "react/static-property-placement": "off",
    "react/prop-types": "off",
    "react/jsx-props-no-spreading": "off",
    // watch bug: https://github.com/airbnb/javascript/pull/2501
    "react/function-component-definition": [2, { namedComponents: "function-declaration" }],
    "@typescript-eslint/ban-types": "off",
    "@typescript-eslint/no-empty-interface": "off",
    "@typescript-eslint/ban-ts-ignore": "off",
    "@typescript-eslint/prefer-namespace-keyword": "off",
    "@typescript-eslint/no-explicit-any": "off", //["error", { ignoreRestArgs: true, }],
    "@typescript-eslint/no-namespace": "off",
    "prettier/prettier": ["error"],
    "no-await-in-loop": 0,
    "no-bitwise": 0,
    "no-param-reassign": 0,
    "no-return-assign": ["error", "except-parens"],
    "no-underscore-dangle": 0,
    "no-use-before-define": 0,
    "unused-imports/no-unused-imports": "error",
    "no-unused-expressions": ["error", { allowShortCircuit: true, allowTernary: true }],
    "no-console": process.env.NODE_ENV === "production" ? "error" : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "error" : "off",
    "no-plusplus": 0,
    "class-methods-use-this": 0,
    "max-len": [
      "warn",
      {
        code: 120,
        tabWidth: 2,
        comments: 1000,
        ignoreComments: true,
        ignoreTrailingComments: true,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
      },
    ],
    "import/extensions": [
      "error",
      "ignorePackages",
      {
        js: "never",
        jsx: "never",
        ts: "never",
        tsx: "never",
      },
    ],
  },
  overrides: [
    {
      files: ["*.ts"],
      parser: "@typescript-eslint/parser",
      rules: {
        "@typescript-eslint/explicit-function-return-type": [
          "error",
          {
            allowExpressions: true,
            allowDirectConstAssertionInArrowFunctions: true,
            allowConciseArrowFunctionExpressionsStartingWithVoid: true,
          },
        ],
      },
    },
  ],

  settings: {
    "import/parsers": {
      "@typescript-eslint/parser": [".ts", ".tsx"],
    },
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true, // always try to resolve types under `<root>@types` directory even it doesn't contain any source code, like `@types/unist`
        project: ["./tsconfig.json"],
      },
    },
  },
};
