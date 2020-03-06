// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require("path");

const rootDir = process.cwd();
module.exports = {
  verbose: true,
  rootDir,
  testMatch: [`${__dirname}/**/*.test.[jt]s?(x)`],
  testPathIgnorePatterns: ["/node_modules/", `.eslintrc.js$`, `config.js$`],
  coverageDirectory: "coverage", // {root}/coverage
  collectCoverageFrom: ["lib/**/*.{js,jsx}"],
  moduleNameMapper: {
    "web-ui-pack": path.join(rootDir, "lib")
  }
};
