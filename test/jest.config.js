const rootDir = process.cwd();
const moduleNameMapper = {
  "^web-ui-pack/(.*)": `${rootDir}/dist/$1`,
};

// details here: https://jestjs.io/docs/configuration

/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  verbose: true,
  rootDir,
  testMatch: [`${__dirname}/**/*.test.[jt]s?(x)`],
  testPathIgnorePatterns: ["/node_modules/", `.eslintrc.js$`, `config.js$`],
  coverageDirectory: "coverage", // {root}/coverage
  collectCoverage: true,
  collectCoverageFrom: ["dist/**/*.{js,jsx}", "!**/icomoon/**"],
  coverageProvider: "v8", // https://jestjs.io/docs/configuration#coverageprovider-string
  coverageReporters: ["text", "html"],
  moduleNameMapper,
  testEnvironment: "jsdom", // https://jestjs.io/docs/configuration#testenvironment-string
  projects: [
    {
      rootDir,
      displayName: "general",
      testMatch: [`${__dirname}/jest/**/*.test.[jt]s?(x)`],
      moduleNameMapper,
      modulePathIgnorePatterns: [`${rootDir}/package.json`],
      testEnvironment: "jsdom",
      setupFiles: [`${__dirname}/jest.setup.js`],
    },
    {
      rootDir,
      displayName: "browser-behavior",
      testMatch: [`${__dirname}/browser/**/*.test.[jt]s?(x)`],
      moduleNameMapper,
      preset: "jest-puppeteer",
      testEnvironment: `${__dirname}/browser/jest-env-puppeteer.js`,
    },
  ],
};
