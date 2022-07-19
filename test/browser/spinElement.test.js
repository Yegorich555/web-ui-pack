// ES5 import is required otherwise jest-env conflicts with puppeeter-env
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const WUPSpinElement = require("web-ui-pack/spinElement").default;

/** @type WUPSpinElement */
let testEl;
beforeEach(async () => {
  jest.spyOn(document, "createElement").getMockImplementation(() => ({ append: () => {} }));
  await page.evaluate(() => {
    WUPSpinElement.$defaults.overflowOffset = [2, 2];
    renderHtml(
      `<button>
        <span>Some text</span>
        <wup-spin />
      </button>`
    );
    window.testEl = document.querySelector("wup-spin");
  });
  await page.waitForTimeout(20); // timeout required because of debounceFilters
});

describe("spinElement", () => {
  test("target without position:relative", async () => {
    const t = await page.evaluate(() => ({
      html: testEl.parentElement.outerHTML,
      /** @type DOMRect */
      rect: testEl.getBoundingClientRect().toJSON(),
      /** @type DOMRect */
      parentRect: testEl.parentElement.getBoundingClientRect().toJSON(),
      /** @type DOMRect */
      fadeRect: testEl.querySelector("[fade]").getBoundingClientRect().toJSON(),
    }));
    expect(t.html).toMatchInlineSnapshot(`
      "<button aria-busy=\\"true\\">
              <span>Some text</span>
              <wup-spin aria-label=\\"Loading. Please wait\\" style=\\"position: absolute; transform: translate(26px, -1.5px) scale(0.425);\\">
            <div></div><div fade=\\"\\" style=\\"border-radius: 0px; transform: translate(-18px, 9.5px) scale(2.35294); width: 76px; height: 21px;\\"></div></wup-spin></button>"
    `);
    expect(t.rect.width).toBe(t.rect.height);
    expect(t.rect.height).toBeLessThan(t.parentRect.height);
    expect(t.fadeRect.height).toBe(t.parentRect.height);
    expect(t.fadeRect.width).toBe(Math.round(t.parentRect.width));
    expect(t.rect).toMatchInlineSnapshot(`
      Object {
        "bottom": 27,
        "height": 17,
        "left": 37.5,
        "right": 54.5,
        "top": 10,
        "width": 17,
        "x": 37.5,
        "y": 10,
      }
    `);
  });

  test("target with position:relative", async () => {
    await page.evaluate(() => (testEl.parentElement.style.position = "relative"));
    await page.waitForTimeout(20);
    const t = await page.evaluate(() => ({
      html: testEl.parentElement.outerHTML,
      /** @type DOMRect */
      rect: testEl.getBoundingClientRect().toJSON(),
    }));
    expect(t.html).toMatchInlineSnapshot(`
      "<button aria-busy=\\"true\\" style=\\"position: relative;\\">
              <span>Some text</span>
              <wup-spin aria-label=\\"Loading. Please wait\\" style=\\"position: absolute; transform: translate(18px, -9.5px) scale(0.425);\\">
            <div></div><div fade=\\"\\" style=\\"border-radius: 0px; transform: translate(-18px, 9.5px) scale(2.35294); width: 76px; height: 21px;\\"></div></wup-spin></button>"
    `);
    expect(t.rect).toMatchInlineSnapshot(`
      Object {
        "bottom": 29,
        "height": 17,
        "left": 39.5,
        "right": 56.5,
        "top": 12,
        "width": 17,
        "x": 39.5,
        "y": 12,
      }
    `);
  });

  test("target.parent with position:relative", async () => {
    await page.evaluate(() => (document.body.style.position = "relative"));
    await page.waitForTimeout(20);
    const t = await page.evaluate(() => ({
      html: testEl.parentElement.outerHTML,
      /** @type DOMRect */
      rect: testEl.getBoundingClientRect().toJSON(),
    }));
    expect(t.html).toMatchInlineSnapshot(`
      "<button aria-busy=\\"true\\">
              <span>Some text</span>
              <wup-spin aria-label=\\"Loading. Please wait\\" style=\\"position: absolute; transform: translate(18px, -9.5px) scale(0.425);\\">
            <div></div><div fade=\\"\\" style=\\"border-radius: 0px; transform: translate(-18px, 9.5px) scale(2.35294); width: 76px; height: 21px;\\"></div></wup-spin></button>"
    `);
    expect(t.rect).toMatchInlineSnapshot(`
      Object {
        "bottom": 27,
        "height": 17,
        "left": 37.5,
        "right": 54.5,
        "top": 10,
        "width": 17,
        "x": 37.5,
        "y": 10,
      }
    `);
  });

  test("target hidden > spinner hidden", async () => {
    await page.evaluate(() => (testEl.parentElement.style.display = "none"));
    await page.waitForTimeout(20);
    const t = await page.evaluate(() => ({ html: testEl.parentElement.outerHTML }));
    expect(t.html).toMatchInlineSnapshot(`
      "<button aria-busy=\\"true\\" style=\\"display: none;\\">
              <span>Some text</span>
              <wup-spin aria-label=\\"Loading. Please wait\\" style=\\"position: absolute; transform: translate(18px, -9.5px) scale(0.425); display: none;\\">
            <div></div><div fade=\\"\\" style=\\"border-radius: 0px; transform: translate(-18px, 9.5px) scale(2.35294); width: 76px; height: 21px;\\"></div></wup-spin></button>"
    `);
  });

  test("$options.fit", async () => {
    await page.evaluate(() => {
      testEl.$options.inline = true;
      testEl.$options.fit = false;
    });
    await page.waitForTimeout(20);
    let t = await page.evaluate(() => ({ html: testEl.parentElement.outerHTML }));
    expect(t.html).toMatchInlineSnapshot(`
      "<button aria-busy=\\"true\\">
              <span>Some text</span>
              <wup-spin aria-label=\\"Loading. Please wait\\" style=\\"\\">
            <div></div></wup-spin></button>"
    `);

    await page.evaluate(() => (testEl.$options.fit = true));
    await page.waitForTimeout(20);
    t = await page.evaluate(() => ({ html: testEl.parentElement.outerHTML }));
    expect(t.html).toMatchInlineSnapshot(`
      "<button aria-busy=\\"true\\">
              <span>Some text</span>
              <wup-spin aria-label=\\"Loading. Please wait\\" style=\\"--spin-size:15px; --spin-item-size: calc( calc( 3em / 8) * 0.375);\\">
            <div></div></wup-spin></button>"
    `);
  });
});
