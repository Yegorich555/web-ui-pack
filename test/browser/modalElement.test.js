// ES5 import is required otherwise jest-env conflicts with puppeeter-env
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const WUPModalElement = require("web-ui-pack/modalElement").default;
const { setTimeout: waitTimeout } = require("node:timers/promises");

beforeEach(async () => {
  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "reduce" }, // disable animations
  ]);

  await page.evaluate(() => {
    WUPModalElement.$use();
    renderHtml(
      `<button id="clickBtn">Login</button>
      <wup-modal w-target='#clickBtn'>
        <h2>Some text</h2>
        <input type='text'/>
      </wup-modal>`
    );
    document.getElementById("clickBtn").focus();
  });
  await waitTimeout(20); // timeout required because of debounceFilters
});

describe("modalElement", () => {
  test("focus behavior", async () => {
    const getInfo = () =>
      page.evaluate(() => {
        const a = document.activeElement;
        return {
          html: document.body.outerHTML,
          focused: a?.id ? `#${a.id}` : a?.outerHTML,
          isOpened: document.querySelector("wup-modal")?.$isOpened,
        };
      });
    let t = await getInfo();
    expect(t.isOpened).toBe(false);
    expect(t.html).toMatchInlineSnapshot(`
      "<body><div id="app"><button id="clickBtn">Login</button>
            <wup-modal w-target="#clickBtn">
              <h2>Some text</h2>
              <input type="text">
            </wup-modal></div></body>"
    `);
    expect(t.focused).toBe("#clickBtn");

    // focus on input inside: by default skip btnClose
    await page.click("#clickBtn");
    await waitTimeout(10);
    t = await getInfo();
    expect(t.isOpened).toBe(true);
    expect(t.html).toMatchInlineSnapshot(`
      "<body class="wup-modal-open"><div id="app"><button id="clickBtn">Login</button>
            <wup-modal w-target="#clickBtn" open="" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="wup1" w-placement="center" show=""><button type="button" aria-label="close" wup-icon="" close="" data-close="modal"></button>
              <h2 id="wup1">Some text</h2>
              <input type="text">
            </wup-modal></div><div class="wup-modal-fade" show=""></div></body>"
    `);
    expect(t.focused).toMatchInlineSnapshot(`"<input type="text">"`);

    // focus back on close
    await page.evaluate(() => document.querySelector("wup-modal").$close());
    await waitTimeout(10);
    t = await getInfo();
    expect(t.isOpened).toBe(false);
    expect(t.html).toMatchInlineSnapshot(`
      "<body><div id="app"><button id="clickBtn">Login</button>
            <wup-modal w-target="#clickBtn" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="wup1" w-placement="center"><button type="button" aria-label="close" wup-icon="" close="" data-close="modal"></button>
              <h2 id="wup1">Some text</h2>
              <input type="text">
            </wup-modal></div></body>"
    `);
    expect(t.focused).toMatchInlineSnapshot(`"#clickBtn"`);
  });
});
