const WUPTextControl = require("web-ui-pack/controls/text").default;

/** @type WUPTextControl */
let el;

beforeEach(async () => {
  await page.evaluate(() => {
    const tagName = "wup-text";
    !WUPTextControl && console.error("missed");
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
  });
  await page.waitForTimeout(2); // timeout required because of debounceFilters

  page.getInfo = () =>
    page.evaluate(() => ({
      ...window.t,
      id: document.activeElement.id,
      trueId: document.getElementById("trueEl").$refInput.id,
    }));
});

describe("control.text", () => {
  test("click on control > focus", async () => {
    // checking default browser behavior
    await page.click("#fakeLabel");
    let t = await page.getInfo();
    expect(t.id).toBe("fakeInput");

    await page.click("#fakeLabel");
    t = await page.getInfo();
    expect(t.id).toBe("fakeInput");
    expect(t.gotBlur).toBe(1); // checking if focus on label again blures input

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

    await page.click("[clear]"); // checking if click on btn-clear moves focus to input
    t = await page.getInfo();
    expect(t.id).toBe(t.trueId);

    await page.click("[clear]"); // checking again
    t = await page.getInfo();
    expect(t.id).toBe(t.trueId);
  });

  test("click on err moves focus into input", async () => {
    await page.evaluate(() => el.$showError("Some message here"));
    await page.waitForTimeout(100); // wait for popup

    await page.click("[error]");
    let t = await page.getInfo();
    expect(t.id).toBe(t.trueId);

    await page.click("[error]");
    t = await page.getInfo();
    expect(t.id).toBe(t.trueId);
    expect(t.gotBlurMineEl).toBe(0);
  });
});
