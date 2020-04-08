const pathAlias = require("./webpack.alias");

/* 
tslint won't be supported: https://github.com/palantir/tslint/issues/4534
you should use typescript-eslint/eslint-plugin: https://github.com/typescript-eslint/typescript-eslint/tree/master/packages/eslint-plugin
but you can't do it with {parser: 'babel-eslint'}: https://github.com/typescript-eslint/typescript-eslint#what-about-babel-and-babel-eslint
*/

module.exports = {
  parser: "@typescript-eslint/parser", //babel-eslint
  parserOptions: {
    sourceType: "module",
    ecmaFeatures: {
      jsx: true
    }
  },
  extends: ["airbnb", "prettier", "plugin:@typescript-eslint/recommended"],
  env: {
    es6: true,
    node: true,
    browser: true
  },
  globals: {
    DEV_SERVER: true,
    API_DOMAIN: true
  },
  plugins: ["@typescript-eslint", "json", "prettier"],
  rules: {
    "lines-between-class-members": "off",
    "react/react-in-jsx-scope": "off",
    "react/jsx-filename-extension": [1, { extensions: [".tsx", ".jsx"] }],
    "react/static-property-placement": "off",
    "react/prop-types": "off",
    "react/jsx-props-no-spreading": "off",
    "@typescript-eslint/ban-ts-ignore": "off",
    "@typescript-eslint/prefer-namespace-keyword": "off",
    "@typescript-eslint/no-explicit-any": "off", //["error", { ignoreRestArgs: true, }],
    "prettier/prettier": ["error"],
    "no-underscore-dangle": 0,
    "no-unused-expressions": ["error", { allowShortCircuit: true }],
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
        ignoreRegExpLiterals: true
      }
    ],
    "import/extensions": [
      "error",
      "ignorePackages",
      {
        js: "never",
        jsx: "never",
        ts: "never",
        tsx: "never"
      }
    ],
    "@typescript-eslint/explicit-function-return-type": "off"
  },
  overrides: [
    {
      files: ["*.ts", ".tsx"],
      rules: {
        "@typescript-eslint/explicit-function-return-type": "error"
      }
    }
  ],
  settings: {
    "import/resolver": {
      alias: {
        map: Object.keys(pathAlias).map(key => [key, pathAlias[key]]),
        extensions: [".ts", ".js", ".jsx", ".tsx", ".json"]
      }
    }
  }
};
