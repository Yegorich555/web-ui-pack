import fs from "fs";

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

beforeAll(async () => {
  await injectFile(page, require.resolve("./srv/bundle.js"));
  await page.waitForSelector("#main");
});

describe("baseControl", () => {
  test("autoFocus", async () => {
    await page.evaluate(() => {
      renderIt(<span>Test</span>);
    });
    // console.warn("gotInside", document);

    // eslint-disable-next-line global-require
    // const TextControl = require("web-ui-pack");
    // dom.render(<TextControl id="textId" autoFocus />);
    // const activeElement = await page.evaluate(() => document.activeElement);
    // expect(activeElement.id).toBe("textId");
  });
});
