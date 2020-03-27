module.exports = {
  extends: ["plugin:jest/recommended"],
  plugins: ["jest"],
  rules: {
    "jest/expect-expect": "off",
    "jest/no-commented-out-tests": "off",
    "@typescript-eslint/no-var-requires": "off"
  }
};
