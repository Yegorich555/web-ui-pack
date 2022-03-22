// ES5 import is required otherwise jest-env conflicts with puppeeter-env
const WUPPopupElement = require("web-ui-pack/popup/popupElement").default;

/** @type WUPPopupElement */
let testEl;
beforeEach(async () => {
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
    await page.waitForTimeout(1); // timeout required because of debounceFilters
    let t = await page.evaluate(() => ({ ...t, html: testEl.outerHTML, isOpened: testEl.$isOpened }));
    expect(t.isOpened).toBeTruthy();
    expect(t.gotShow).toBe(1);
    expect(t.gotHide).toBe(0);
    // bug: toMatchInlineSnapshot doesn't work
    // checking placement
    expect(t.html).toBe(
      '<wup-popup position="bottom" style="display: block; transform: translate(72.4219px, 29px);">Popup text</wup-popup>'
    );
    await page.click("label"); // click again should hide
    await page.waitForTimeout(1); // timeout required because of debounceFilters
    t = await page.evaluate(() => ({ ...t, html: testEl.outerHTML, isOpened: testEl.$isOpened }));
    expect(t.isOpened).toBeFalsy();
    expect(t.gotShow).toBe(1);
    expect(t.gotHide).toBe(1);
    expect(t.html).toBe(
      '<wup-popup position="bottom" style="transform: translate(72.4219px, 29px);">Popup text</wup-popup>'
    );
  });

  test("showCase: click & focus", async () => {
    await page.evaluate(() => (testEl.$options.showCase = (1 << 1) | (1 << 2)));
    await page.waitForTimeout(1); // timeout required because of debounceFilters
    let t = await page.evaluate(() => ({ ...t, html: testEl.outerHTML, isOpened: testEl.$isOpened }));
    expect(t.gotShow).toBe(0);
    expect(t.gotHide).toBe(0);

    await page.click("label"); // click on label fires click on input also
    await page.waitForTimeout(1); // timeout required because of debounceFilters
    t = await page.evaluate(() => ({ ...t, html: testEl.outerHTML, isOpened: testEl.$isOpened }));
    expect(t.isOpened).toBeTruthy();
    expect(t.gotShow).toBe(1);
    expect(t.gotHide).toBe(0);
  });

  test("showCase: hover & click & focus", async () => {
    await page.evaluate(() => (testEl.$options.showCase = 0b1111111));
    await page.waitForTimeout(1); // timeout required because of debounceFilters
    await page.hover("input");
    let t = await page.evaluate(() => ({ ...t, html: testEl.outerHTML, isOpened: testEl.$isOpened }));
    expect(t.isOpened).toBeFalsy(); // because of timeout
    await page.waitForTimeout(201); // hoverShowTimeout is 200 by default
    t = await page.evaluate(() => ({ ...t, html: testEl.outerHTML, isOpened: testEl.$isOpened }));
    expect(t.isOpened).toBeTruthy();

    await page.hover("span");
    t = await page.evaluate(() => ({ ...t, html: testEl.outerHTML, isOpened: testEl.$isOpened }));
    expect(t.isOpened).toBeTruthy(); // because of timeout
    await page.waitForTimeout(501); // hoverShowTimeout is 500 by default
    t = await page.evaluate(() => ({ ...t, html: testEl.outerHTML, isOpened: testEl.$isOpened }));
    expect(t.isOpened).toBeFalsy();

    await page.click("label");
    t = await page.evaluate(() => ({ ...t, html: testEl.outerHTML, isOpened: testEl.$isOpened }));
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
      '<body><div id="app"><label><span>Label text</span><input><wup-popup position="bottom" style="display: block; transform: translate(72.4219px, 39px);">Popup text</wup-popup><wup-popup-arrow style="transform: translate(124.422px, 29.5px) rotate(180deg);"></wup-popup-arrow></label></div></body>'
    );
  });
});
