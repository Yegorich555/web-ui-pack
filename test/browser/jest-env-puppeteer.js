const fs = require("fs");
const nodePath = require("path");
const Env = require("jest-environment-puppeteer");

function getCallerFile() {
  const originalFunc = Error.prepareStackTrace;
  let callerfile;
  try {
    const err = new Error();
    Error.prepareStackTrace = (_err, stack) => {
      return stack;
    };
    // const currentfile = err.stack.shift().getFileName();
    while (err.stack.length) {
      callerfile = err.stack.shift().getFileName();
      // if (currentfile !== callerfile) break;
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

class PuppeteerEnvironment extends Env {
  async setup() {
    await super.setup();

    // extend global.page here
    const { page } = this.global;
    page.injectFile = function inject(path) {
      const callerfile = getCallerFile();
      const dirName = nodePath.dirname(callerfile);
      return injectFile(this, require.resolve(path, { paths: [dirName] }));
    };

    await page.injectFile(require.resolve("./srv/bundle.js"));
    // await injectFile(page, require.resolve("./srv/bundle.js"));
    // page.render = el => page.evaluate(() => renderIt(el));
  }
}

module.exports = PuppeteerEnvironment;
