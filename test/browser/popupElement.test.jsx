// ES5 import is required otherwise jest-env conflicts with puppeeter-env
const WUPPopupElement = require("web-ui-pack/popup/popupElement").default;

/** @type WUPPopupElement */
let testEl;
beforeEach(async () => {
  jest.spyOn(document, "createElement").getMockImplementation(() => ({ append: () => {} }));
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
    WUPPopupElement.$defaults.openCase = 1 << 3; // onClick;
    renderIt(
      <label key={Date.now()}>
        <span>Label text</span>
        <input />
        <wup-popup>Popup text</wup-popup>
      </label>
    );

    const el = document.querySelector("wup-popup");
    window.t = { gotShow: 0, gotHide: 0 };
    el.addEventListener("$open", () => ++window.t.gotShow);
    el.addEventListener("$close", () => ++window.t.gotHide);
    window.testEl = el;
  });
  await page.waitForTimeout(5); // timeout required because of debounceFilters
});

describe("popupElement", () => {
  test("clickOnLabel with input - single event", async () => {
    await page.click("label");
    await page.waitForTimeout(320); // timeout required because of debounceFilters
    let t = await page.evaluate(() => ({ ...t, html: testEl.outerHTML, isOpened: testEl.$isOpened }));
    expect(t.isOpened).toBe(true);
    expect(t.gotShow).toBe(1);
    expect(t.gotHide).toBe(0);
    // bug: toMatchInlineSnapshot doesn't work
    // checking placement
    expect(t.html).toBe(
      '<wup-popup open="" position="bottom" show="" style="transform: translate(72px, 29px);">Popup text</wup-popup>'
    );
    await page.click("label"); // click again should hide
    t = await page.evaluate(() => ({ ...t, html: testEl.outerHTML, isOpened: testEl.$isOpened }));
    expect(t.isOpened).toBe(true); // because animation-open works
    await page.waitForTimeout(310); // wait for animation
    t = await page.evaluate(() => ({ ...t, html: testEl.outerHTML, isOpened: testEl.$isOpened }));
    expect(t.isOpened).toBe(false);
    expect(t.gotShow).toBe(1);
    expect(t.gotHide).toBe(1);
    expect(t.html).toBe(
      '<wup-popup position="bottom" style="transform: translate(72px, 29px);">Popup text</wup-popup>'
    );

    // checking when animation disabled
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]); // disable animations
    await page.click("label");
    await page.waitForTimeout(1); // timeout required because of debounceFilters
    t = await page.evaluate(() => ({ ...t, html: testEl.outerHTML, isOpened: testEl.$isOpened }));
    expect(t.isOpened).toBe(true);
    await page.click("label"); // click again should hide
    t = await page.evaluate(() => ({ ...t, html: testEl.outerHTML, isOpened: testEl.$isOpened }));
    await page.waitForTimeout(1); // timeout required because of debounceFilters
    expect(t.isOpened).toBe(false);
  });

  test("openCase: click & focus", async () => {
    await page.evaluate(() => (testEl.$options.openCase = (1 << 2) | (1 << 3)));
    await page.waitForTimeout(1); // timeout required because of debounceFilters
    let t = await page.evaluate(() => ({ ...t, html: testEl.outerHTML, isOpened: testEl.$isOpened }));
    expect(t.gotShow).toBe(0);
    expect(t.gotHide).toBe(0);

    await page.click("label"); // click on label fires click on input also
    await page.waitForTimeout(301); // timeout required because of animation
    t = await page.evaluate(() => ({ ...t, html: testEl.outerHTML, isOpened: testEl.$isOpened }));
    expect(t.isOpened).toBe(true);
    expect(t.gotShow).toBe(1);
    expect(t.gotHide).toBe(0);
  });

  test("openCase: hover & click & focus", async () => {
    await page.evaluate(() => (testEl.$options.openCase = 0b1111111));
    await page.waitForTimeout(1); // timeout required because of debounceFilters
    await page.hover("input");
    let t = await page.evaluate(() => ({ ...t, html: testEl.outerHTML, isOpened: testEl.$isOpened }));
    expect(t.isOpened).toBe(false); // because of timeout
    await page.waitForTimeout(300); // hoverOpenTimeout is 200 by default
    t = await page.evaluate(() => ({ ...t, html: testEl.outerHTML, isOpened: testEl.$isOpened }));
    expect(t.isOpened).toBe(true);

    await page.hover("span");
    t = await page.evaluate(() => ({ ...t, html: testEl.outerHTML, isOpened: testEl.$isOpened }));
    expect(t.isOpened).toBe(true); // because of timeout
    await page.waitForTimeout(500 + 300 + 100); // hoverOpenTimeout is 500 by default and hide-animation is 300
    t = await page.evaluate(() => ({ ...t, html: testEl.outerHTML, isOpened: testEl.$isOpened }));
    expect(t.isOpened).toBe(false);

    await page.click("label");
    t = await page.evaluate(() => ({ ...t, html: testEl.outerHTML, isOpened: testEl.$isOpened }));
    expect(t.isOpened).toBe(true);
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
      '<wup-popup open="" position="bottom" show="" style="min-width: 177px; min-height: 21px; transform: translate(72px, 29px);">Popup text</wup-popup>'
    );
  });

  test("arrow", async () => {
    await page.evaluate(() => {
      testEl.$options.arrowEnable = true;
    });
    await page.click("label");
    await page.waitForTimeout(1); // timeout required because of debounceFilters
    const t = await page.evaluate(() => ({ ...t, html: document.body.outerHTML }));
    expect(t.html).toMatchInlineSnapshot(
      `"<body><div id="app"><label><span>Label text</span><input><wup-popup open="" position="bottom" show="" style="transform: translate(72px, 39px);">Popup text</wup-popup><wup-popup-arrow style="transform: translate(124px, 29px) rotate(180.1deg);"></wup-popup-arrow></label></div></body>"`
    );
  });
});
