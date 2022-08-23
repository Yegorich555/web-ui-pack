// ES5 import is required otherwise jest-env conflicts with puppeeter-env
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const WUPSwitchControl = require("web-ui-pack/controls/switch").default;

/** @type WUPSwitchControl */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let testEl;
beforeEach(async () => {
  jest.spyOn(document, "createElement").getMockImplementation(() => ({ append: () => {} }));
  await page.evaluate(() => {
    renderHtml(`<wup-switch></wup-switch>`);
  });
  await page.waitForTimeout(20); // timeout required because of debounceFilters
  await page.evaluate(() => (window.testEl = document.querySelector("wup-switch")));
});

describe("control.switch", () => {
  test("user actions", async () => {
    let v = await page.evaluate(() => document.querySelector("wup-switch").$value);
    expect(v).toBe(false);

    await page.click("wup-switch");
    v = await page.evaluate(() => document.querySelector("wup-switch").$value);
    expect(v).toBe(true);

    await page.keyboard.press("Space");
    v = await page.evaluate(() => document.querySelector("wup-switch").$value);
    expect(v).toBe(false);

    await page.keyboard.press("Space");
    v = await page.evaluate(() => document.querySelector("wup-switch").$value);
    expect(v).toBe(true);
  });
});
