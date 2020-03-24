module.exports = {
  extends: ["plugin:jest/recommended"],
  plugins: ["jest"],
  rules: {
    "jest/expect-expect": "off",
    "@typescript-eslint/no-var-requires": "off"
  }
};
