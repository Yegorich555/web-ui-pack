module.exports = {
  extends: ["plugin:jest/recommended"],
  plugins: ["jest"],
  rules: {
    "jest/expect-expect": "off",
    "jest/no-commented-out-tests": "off",
    "@typescript-eslint/no-var-requires": "off",
    "no-return-assign": "off",
    "max-classes-per-file": "off"
  }
};
