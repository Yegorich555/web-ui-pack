// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require("path");

module.exports = {
  verbose: false,
  testMatch: [`${__dirname}/**/*.js`],
  testPathIgnorePatterns: ["/node_modules/", `${__dirname}/.eslintrc.js`, `config.js$`],
  coverageDirectory: path.join(process.cwd(), "coverage")
};
