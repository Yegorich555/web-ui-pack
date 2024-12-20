/* eslint-disable jsx-a11y/no-autofocus */
const onScrollStop = require("web-ui-pack/helpers/onScrollStop").default;

beforeAll(async () => {
  await page.evaluate(async () => {
    await renderIt(<div style={{ height: "2000px" }} />);
    window.gotEvent = 0;
    onScrollStop(document.body, () => (window.gotEvent += 1));
  });
});

describe("helper.onScrollStop", () => {
  test("ordinary behavior", async () => {
    const hasScroll = await page.evaluate(() => document.body.offsetHeight !== document.body.scrollHeight);
    expect(hasScroll).toBe(true);
    await page.waitForTimeout(1000);
    expect(await page.evaluate(() => window.gotEvent)).toBe(0);
    await page.evaluate(() => document.body.scroll({ behavior: "smooth", top: document.body.scrollHeight }));
    await page.waitForTimeout(1000);
    expect(await page.evaluate(() => window.gotEvent)).toBe(1);
  });
});
