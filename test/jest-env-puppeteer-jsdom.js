const Env = require("jest-environment-puppeteer");

class PuppeteerEnvironment extends Env {
  async setup() {
    await super.setup();
    // todo extend global.page here
  }
}

module.exports = PuppeteerEnvironment;
