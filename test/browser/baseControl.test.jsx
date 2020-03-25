describe("baseControl", () => {
  test("autoFocus", async () => {
    await page.evaluate(() => {
      renderIt(<span>Test</span>);
    });
    // await page.render(<span>Test</span>);
    // console.warn("gotInside", document);
    // eslint-disable-next-line global-require
    // const TextControl = require("web-ui-pack");
    // dom.render(<TextControl id="textId" autoFocus />);
    // const activeElement = await page.evaluate(() => document.activeElement);
    // expect(activeElement.id).toBe("textId");
  });
});
