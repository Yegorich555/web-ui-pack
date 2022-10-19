// ES5 import is required otherwise jest-env conflicts with puppeeter-env
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const WUPCalendarControl = require("web-ui-pack/controls/calendar").default;

/** @type WUPCalendarControl */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let testEl;
beforeEach(async () => {
  await page.evaluate(() => {
    renderHtml(`<wup-calendar startwith="day" initvalue="2022-09-05"></wup-calendar>`);
  });
  await page.waitForTimeout(20); // timeout required because of debounceFilters
  await page.evaluate(() => (window.testEl = document.querySelector("wup-calendar")));
});

describe("control.calendar", () => {
  test("control height equal for pickers", async () => {
    await page.addStyleTag({ content: "body { font-size: 14px}" });
    const getInfo = () =>
      page.evaluate(() => {
        /** @type WUPCalendarControl */
        const el = document.querySelector("wup-calendar");
        return { headerText: el.querySelector("header>button").textContent, h: el.offsetHeight, w: el.offsetWidth };
      });
    let info = await getInfo();
    expect(info).toEqual({ headerText: "September 2022", h: 270, w: 250 });

    await page.click("wup-calendar header>button");
    await page.waitForTimeout(310);
    info = await getInfo();
    expect(info).toEqual({ headerText: "2022", h: 270, w: 250 });

    await page.click("wup-calendar header>button");
    await page.waitForTimeout(310);
    info = await getInfo();
    expect(info).toEqual({ headerText: "2018 ... 2033", h: 270, w: 250 });
  });
});
