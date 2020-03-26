// todo ES6 import doesn't work with puppeteer.evaluate
const { TextControl } = require("web-ui-pack");

describe("baseControl", () => {
  test("autoFocus", async () => {
    const id = await page.evaluate(() => {
      renderIt(<TextControl id="someId" autoFocus />);
      return document.activeElement.id;
    });
    expect(id).toBe("someId");
  });
});
