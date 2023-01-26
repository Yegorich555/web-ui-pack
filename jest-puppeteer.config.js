// https://github.com/smooth-code/jest-puppeteer
// https://github.com/smooth-code/jest-puppeteer/blob/master/packages/jest-environment-puppeteer/README.md
module.exports = {
  launch: {
    // dumpio: true,
    headless: true,
    devtools: true,
  },
  browserContext: "default",
};
