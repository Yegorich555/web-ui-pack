/* eslint-disable jest/no-conditional-expect */
/* eslint-disable jest/no-export */
const { setTimeout: waitTimeout } = require("node:timers/promises");

/** @type WUPTextControl */
let el;
export function initTestTextControl({ htmlTag, type, onBeforeEach }) {
  beforeEach(async () => {
    await onBeforeEach?.call();
    await page.addStyleTag({ content: "body { font-size: 14px}" });
    await page.evaluate(
      (opts) => {
        const tagName = opts.htmlTag;
        // eslint-disable-next-line no-eval
        !eval(opts.type) && console.error("missed");
        renderHtml(
          `<label id="fakeLabel">
            <span>Label text</span>
            <input id="fakeInput" />
          </label>
          <${tagName} id="trueEl" />`
        );
        window.el = document.querySelector(tagName);
        const fakeInput = document.getElementById("fakeInput");
        const trueInput = document.getElementById("trueEl").$refInput;
        window.t = { gotBlur: 0, gotBlurMineEl: 0 };
        fakeInput.addEventListener("blur", () => ++window.t.gotBlur);
        trueInput.addEventListener("blur", () => ++window.t.gotBlurMineEl);
      },
      { htmlTag, type }
    );
    await waitTimeout(2); // timeout required because of debounceFilters

    page.getInfo = () =>
      page.evaluate(() => ({
        ...window.t,
        id: document.activeElement.id,
        trueId: document.getElementById("trueEl").$refInput.id,
      }));
  });
}

export function testTextControl({ isComboCtrl } = {}) {
  test("control height", async () => {
    // await page.addStyleTag({ content: "body { font-size: 14px}" });
    const h = await page.evaluate(() => document.getElementById("trueEl").offsetHeight);
    expect(h).toBe(44);
  });

  test("click on control > focus", async () => {
    // checking default browser behavior
    await page.click("#fakeLabel");
    let t = await page.getInfo();
    expect(t.id).toBe("fakeInput");

    await page.click("#fakeLabel");
    t = await page.getInfo();
    expect(t.id).toBe("fakeInput");
    expect(t.gotBlur).toBe(0); // checking if focus on label again not blures input

    // checking with control
    await page.click("#trueEl");
    t = await page.getInfo();
    expect(t.trueId).toBeDefined();
    expect(t.id).toBe(t.trueId);

    await page.click("#trueEl");
    t = await page.getInfo();
    expect(t.id).toBe(t.trueId);
    expect(t.gotBlurMineEl).toBe(0); // it's important case

    await page.click("#fakeLabel");
    t = await page.getInfo();
    expect(t.gotBlurMineEl).toBe(1); // checking if click outside affects on blur

    await page.type("#trueEl input", "1", { delay: 10 });
    await page.click("[clear]"); // checking if click on btn-clear moves focus to input
    t = await page.getInfo();
    expect(t.id).toBe(t.trueId);
  });

  test("click on err moves focus into input", async () => {
    await page.evaluate(() => el.$showError("Some message here"));
    await waitTimeout(100); // wait for popup

    await page.click("[error]");
    await waitTimeout(100); // wait for popup
    let t = await page.getInfo();
    expect(t.id).toBe(t.trueId);

    // for combobox click on error control hides error and opens popup
    if (!isComboCtrl) {
      await page.click("[error]");
      t = await page.getInfo();
      expect(t.id).toBe(t.trueId);
      expect(t.gotBlurMineEl).toBe(0);
    }
  });
}
