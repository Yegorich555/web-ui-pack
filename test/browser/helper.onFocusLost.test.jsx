/* eslint-disable react/button-has-type */
// ES5 import is required otherwise jest-env conflicts with puppeeter-env
const onFocusLost = require("web-ui-pack/helpers/onFocusLost").default;

// impossible testCase: Click on dev.console - focusStay, because no-way to implement click on dev.console properly

const debounceMs = 1;
beforeAll(async () => {
  await page.evaluate(async () => {
    await renderIt(
      <>
        <label id="ctrl" htmlFor="c1">
          <span id="text">TextInput</span>
          <input id="c1" autoFocus />
          <button id="btn">Button</button>
        </label>
        <input id="c2" />
      </>
    );
    const lb = document.querySelector("#ctrl");
    window.gotLeft = 0;
    onFocusLost(lb, () => (window.gotLeft += 1), { debounceMs: 1 });
  });
});

beforeEach(async () => {
  await page.evaluate(() => {
    document.activeElement?.blur?.call(document.activeElement);
    window.gotLeft = 0;
  });
});

describe("helper.onFocusLost", () => {
  test("ordinary behavior", async () => {
    await page.click("#c1");
    expect(await page.evaluate(() => document.activeElement.id)).toBe("c1");

    // click outside the control
    await page.click("#c2");
    await page.waitForTimeout(debounceMs + 1);
    expect(await page.evaluate(() => window.gotLeft)).toBe(1);

    // ordinary click on the label > should return focus to input
    await page.click("#ctrl");
    expect(await page.evaluate(() => document.activeElement.id)).toBe("c1");

    // ordinary click on the label > should move focus to label and returns back to input > so no event again
    await page.click("#text");
    await page.click("#text"); // second time to detect counterIssues
    expect(await page.evaluate(() => document.activeElement.id)).toBe("c1");
    expect(await page.evaluate(() => window.gotLeft)).toBe(1);
    // click on btnInside > no-focusLost for control
    await page.click("#btn");
    await page.waitForTimeout(debounceMs + 1);
    expect(await page.evaluate(() => document.activeElement.id)).toBe("btn");
    expect(await page.evaluate(() => window.gotLeft)).toBe(1);

    // mouseDown on label, mouseMove, mouseUp on label - focusLost (because click is not fired after)
    /** @type DOMRect */
    const r = JSON.parse(
      await page.evaluate(() => {
        window.gotLeft = 0;
        return JSON.stringify(document.querySelector("#text").getBoundingClientRect());
      })
    );
    // await page.screenshot({ path: `d:/test.jpeg` });
    await page.mouse.move(r.x + r.width / 4, r.y + r.height / 2);
    await page.mouse.down();
    expect(await page.evaluate(() => document.activeElement?.tagName)).toBe("BODY");
    await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
    expect(await page.evaluate(() => window.gotLeft)).toBe(0);
    await page.mouse.up();
    await page.waitForTimeout(debounceMs + 3);
    expect(await page.evaluate(() => window.gotLeft)).toBe(1);
  });

  test("focusDebounce with mouse", async () => {
    // click on the label
    await page.click("#text", { delay: 5 });
    expect(await page.evaluate(() => window.gotLeft)).toBe(0);
    await page.waitForTimeout(debounceMs + 5);
    expect(await page.evaluate(() => window.gotLeft)).toBe(0);

    // click outside
    await page.click("#c2", { delay: 5 });
    await page.waitForTimeout(debounceMs + 5);
    expect(await page.evaluate(() => window.gotLeft)).toBe(1);
  });

  test("focusDebounce with touchScreen", async () => {
    // tap on the label
    await page.tap("#text");
    expect(await page.evaluate(() => document.activeElement.id)).toBe("c1");
    expect(await page.evaluate(() => window.gotLeft)).toBe(0);
    await page.tap("#c2");
    await page.waitForTimeout(debounceMs + 1);
    expect(await page.evaluate(() => window.gotLeft)).toBe(1);
  });

  test("focus via tab-keys (keyboard)", async () => {
    await page.click("#c1");

    // focus next
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement.id)).toBe("btn");
    expect(await page.evaluate(() => window.gotLeft)).toBe(0);
    // return focus back
    await page.keyboard.down("Shift");
    await page.keyboard.press("Tab");
    await page.keyboard.up("Shift");
    expect(await page.evaluate(() => document.activeElement.id)).toBe("c1");
    expect(await page.evaluate(() => window.gotLeft)).toBe(0);
    // focus out of label
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => window.gotLeft)).toBe(1);
  });
});
