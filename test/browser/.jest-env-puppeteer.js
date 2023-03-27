const fs = require("fs");
const nodePath = require("path");
const Env = require("jest-environment-puppeteer");

function getCallerFile() {
  const originalFunc = Error.prepareStackTrace;
  let callerfile;

  try {
    const err = new Error();
    Error.prepareStackTrace = (_err, stack) => stack;
    const currentfile = err.stack.shift().getFileName();
    while (err.stack.length) {
      callerfile = err.stack.shift().getFileName();
      if (currentfile !== callerfile) break;
    }
    // eslint-disable-next-line no-empty
  } catch (e) {}

  Error.prepareStackTrace = originalFunc;

  return callerfile;
}

async function injectFile(page, filePath) {
  let contents = await new Promise((resolve, reject) => {
    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) return reject(err);
      return resolve(data);
    });
  });
  contents += `//# sourceURL=${filePath.replace(/\n/g, "")}`;
  return page.mainFrame().evaluate(contents);
}

const handleConsole = (msg) => {
  console[msg._type || "warn"]("\x1b[33m", msg._text, "\x1b[0m");
};

const handleError = (error) => {
  // console.error("\x1b[31m", error.message || error, "\x1b[0m");
  process.emit("uncaughtException", error.message ?? error);
};

class PuppeteerEnvironment extends Env {
  async setup() {
    await super.setup();

    const onReset = async () => {
      // extend global.page here
      const { page } = this.global;
      page.injectFile = function inject(path) {
        const callerfile = getCallerFile();
        const dirName = nodePath.dirname(callerfile);
        return injectFile(this, require.resolve(path, { paths: [dirName] }));
      };

      await page.injectFile(require.resolve("./srv/bundle.js"));
      this.global.pageExt = page;

      page.on("console", handleConsole);
      page.on("error", handleError);
      page.off("pageerror");
      page.on("pageerror", handleError);
    };

    const orig = this.global.jestPuppeteer.resetPage;
    this.global.jestPuppeteer.resetPage = async () => {
      await orig();
      await onReset();
    };

    await onReset();

    this.global.HTMLElement = function fakeHTMLElement() {};
    this.global.document = { createElement: () => {}, head: { prepend: () => {} } };
    this.global.customElements = {
      define: function fake() {},
    };

    // declare empty document for avoiding wrong-test-bug in detectFocusLeft
    // this.global.document = { addEventListener: () => {} };
  }

  async teardown() {
    const { page } = this.global;
    if (page) {
      page.off("console", handleConsole);
      page.off("error", handleError);
      page.off("pageerror", handleError);
    }
    await super.teardown();
  }
}

module.exports = PuppeteerEnvironment;
