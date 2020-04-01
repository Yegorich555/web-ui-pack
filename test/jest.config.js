const rootDir = process.cwd();
const moduleNameMapper = {
  "^web-ui-pack/(.*)": `${rootDir}/lib/$1`
};

module.exports = {
  verbose: true,
  rootDir,
  testMatch: [`${__dirname}/**/*.test.[jt]s?(x)`],
  testPathIgnorePatterns: ["/node_modules/", `.eslintrc.js$`, `config.js$`],
  coverageDirectory: "coverage", // {root}/coverage
  collectCoverage: true,
  collectCoverageFrom: ["lib/**/*.{js,jsx}"],
  moduleNameMapper,
  projects: [
    {
      rootDir,
      displayName: "general",
      testMatch: [`${__dirname}/jest/**/*.test.[jt]s?(x)`],
      moduleNameMapper
    },
    {
      rootDir,
      displayName: "browser-behavior",
      testMatch: [`${__dirname}/browser/**/*.test.[jt]s?(x)`],
      moduleNameMapper,
      preset: "jest-puppeteer",
      testEnvironment: `${__dirname}/browser/jest-env-puppeteer.js`
    }
  ]
};
