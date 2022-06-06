jest.spyOn(document, "createElement").getMockImplementation(() => ({
  append: () => {},
}));
// ES5 import is required otherwise jest-env conflicts with puppeeter-env
const WUPPopupElement = require("web-ui-pack/popup/popupElement").default;

/** @type WUPPopupElement */
let testEl;
beforeEach(async () => {
  jest.spyOn(document, "createElement").getMockImplementation(() => ({
    append: () => {},
  }));
  // https://github.com/puppeteer/puppeteer/blob/v5.2.1/docs/api.md#pageemulatemediafeaturesfeatures
  await page.emulateMediaFeatures([
    // { name: "prefers-color-scheme", value: "dark" },
    { name: "prefers-reduced-motion", value: "no-preference" }, // allow animations
  ]);

  await page.evaluate(() => {
    document.activeElement && document.activeElement.blur();
    WUPPopupElement.$defaults.placement = [
      WUPPopupElement.$placements.$top.$start,
      WUPPopupElement.$placements.$bottom.$start,
    ];
    WUPPopupElement.$defaults.showCase = 4; // onClick;
    renderIt(
      <label key={Date.now()}>
        <span>Label text</span>
        <input />
        <wup-popup>Popup text</wup-popup>
      </label>
    );

    const el = document.querySelector("wup-popup");
    window.t = { gotShow: 0, gotHide: 0 };
    el.addEventListener("$show", () => ++window.t.gotShow);
    el.addEventListener("$hide", () => ++window.t.gotHide);
    window.testEl = el;
  });
  await page.waitForTimeout(5); // timeout required because of debounceFilters
});

describe("popupElement", () => {
  test("clickOnLabel with input - single event", async () => {
    await page.click("label");
    await page.waitForTimeout(300); // timeout required because of debounceFilters
    let t = await page.evaluate(() => ({ ...t, html: testEl.outerHTML, isOpened: testEl.$isOpen }));
    expect(t.isOpened).toBeTruthy();
    expect(t.gotShow).toBe(1);
    expect(t.gotHide).toBe(0);
    // bug: toMatchInlineSnapshot doesn't work
    // checking placement
    expect(t.html).toBe(
      '<wup-popup position="bottom" style="display: block; transform: translate(72.4219px, 29px);">Popup text</wup-popup>'
    );
    await page.click("label"); // click again should hide
    t = await page.evaluate(() => ({ ...t, html: testEl.outerHTML, isOpened: testEl.$isOpen }));
    expect(t.isOpened).toBeTruthy(); // because animation-open works
    await page.waitForTimeout(300); // wait for animation
    t = await page.evaluate(() => ({ ...t, html: testEl.outerHTML, isOpened: testEl.$isOpen }));
    expect(t.isOpened).toBeFalsy();
    expect(t.gotShow).toBe(1);
    expect(t.gotHide).toBe(1);
    expect(t.html).toBe(
      '<wup-popup position="bottom" style="transform: translate(72.4219px, 29px);">Popup text</wup-popup>'
    );

    // checking when animation disabled
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]); // disable animations
    await page.click("label");
    await page.waitForTimeout(1); // timeout required because of debounceFilters
    t = await page.evaluate(() => ({ ...t, html: testEl.outerHTML, isOpened: testEl.$isOpen }));
    expect(t.isOpened).toBeTruthy();
    await page.click("label"); // click again should hide
    t = await page.evaluate(() => ({ ...t, html: testEl.outerHTML, isOpened: testEl.$isOpen }));
    await page.waitForTimeout(1); // timeout required because of debounceFilters
    expect(t.isOpened).toBeFalsy();
  });

  test("showCase: click & focus", async () => {
    await page.evaluate(() => (testEl.$options.showCase = (1 << 1) | (1 << 2)));
    await page.waitForTimeout(1); // timeout required because of debounceFilters
    let t = await page.evaluate(() => ({ ...t, html: testEl.outerHTML, isOpened: testEl.$isOpen }));
    expect(t.gotShow).toBe(0);
    expect(t.gotHide).toBe(0);

    await page.click("label"); // click on label fires click on input also
    await page.waitForTimeout(301); // timeout required because of animation
    t = await page.evaluate(() => ({ ...t, html: testEl.outerHTML, isOpened: testEl.$isOpen }));
    expect(t.isOpened).toBeTruthy();
    expect(t.gotShow).toBe(1);
    expect(t.gotHide).toBe(0);
  });

  test("showCase: hover & click & focus", async () => {
    await page.evaluate(() => (testEl.$options.showCase = 0b1111111));
    await page.waitForTimeout(1); // timeout required because of debounceFilters
    await page.hover("input");
    let t = await page.evaluate(() => ({ ...t, html: testEl.outerHTML, isOpened: testEl.$isOpen }));
    expect(t.isOpened).toBeFalsy(); // because of timeout
    await page.waitForTimeout(202); // hoverShowTimeout is 200 by default
    t = await page.evaluate(() => ({ ...t, html: testEl.outerHTML, isOpened: testEl.$isOpen }));
    expect(t.isOpened).toBeTruthy();

    await page.hover("span");
    t = await page.evaluate(() => ({ ...t, html: testEl.outerHTML, isOpened: testEl.$isOpen }));
    expect(t.isOpened).toBeTruthy(); // because of timeout
    await page.waitForTimeout(501 + 300); // hoverShowTimeout is 500 by default and hide-animation is 300
    t = await page.evaluate(() => ({ ...t, html: testEl.outerHTML, isOpened: testEl.$isOpen }));
    expect(t.isOpened).toBeFalsy();

    await page.click("label");
    t = await page.evaluate(() => ({ ...t, html: testEl.outerHTML, isOpened: testEl.$isOpen }));
    expect(t.isOpened).toBeTruthy();
  });

  test("options.minWidthByTarget/minHeightByTarget", async () => {
    await page.evaluate(() => {
      testEl.$options.minWidthByTarget = true;
      testEl.$options.minHeightByTarget = true;
    });
    await page.click("label");
    await page.waitForTimeout(1); // timeout required because of debounceFilters
    const t = await page.evaluate(() => ({ ...t, html: testEl.outerHTML }));
    expect(t.html).toBe(
      '<wup-popup position="bottom" style="min-width: 177px; min-height: 21px; display: block; transform: translate(72.4219px, 29px);">Popup text</wup-popup>'
    );
  });

  test("arrow", async () => {
    await page.evaluate(() => {
      testEl.$options.arrowEnable = true;
    });
    await page.click("label");
    await page.waitForTimeout(1); // timeout required because of debounceFilters
    const t = await page.evaluate(() => ({ ...t, html: document.body.outerHTML }));
    expect(t.html).toBe(
      '<body><div id="app"><label><span>Label text</span><input><wup-popup position="bottom" style="display: block; transform: translate(72.4219px, 39px);">Popup text</wup-popup><wup-popup-arrow style="transform: translate(124.422px, 29px) rotate(180deg);"></wup-popup-arrow></label></div></body>'
    );
  });
});
