// https://www.npmjs.com/package/jest-environment-puppeteer

/** @type {import('jest-environment-puppeteer').JestPuppeteerConfig} */
module.exports = {
  launch: {
    // dumpio: true,
    headless: true,
    devtools: true,
  },
  browserContext: "default",
};
