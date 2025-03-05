/* eslint-disable react/button-has-type */
// ES5 import is required otherwise jest-env conflicts with puppeeter-env
const onFocusGot = require("web-ui-pack/helpers/onFocusGot").default;

// impossible testCase: Click on dev.console - focusStay, because no-way to implement click on dev.console properly

const debounceMs = 1;
beforeAll(async () => {
  await page.evaluate(async () => {
    await renderIt(
      <>
        <label id="ctrl" htmlFor="c1">
          <span id="text">TextInput</span>
          <input id="c1" />
          <button id="btn">Button</button>
        </label>
        <input id="c2" />
      </>
    );
    const lb = document.querySelector("#ctrl");
    window.gotFocus = 0;
    onFocusGot(lb, () => (window.gotFocus += 1), { debounceMs: 1 });
  });
});

beforeEach(async () => {
  await page.evaluate(() => {
    window.gotFocus = 0;
    document.activeElement?.blur?.call(document.activeElement);
  });
});

describe("helper.onFocusGot", () => {
  test("ordinary behavior", async () => {
    expect(await page.evaluate(() => document.activeElement.id)).not.toBe("c1");

    // click by control
    await page.click("#c1");
    expect(await page.evaluate(() => window.gotFocus)).toBe(1);

    // ordinary click on the label > should return focus to input
    await page.click("#ctrl");
    expect(await page.evaluate(() => document.activeElement.id)).toBe("c1");
    expect(await page.evaluate(() => window.gotFocus)).toBe(1);

    // ordinary click on the label > should move focus to label and returns back to input > so no event again
    await page.click("#text");
    await page.click("#text"); // second time to detect counterIssues
    expect(await page.evaluate(() => document.activeElement.id)).toBe("c1");
    expect(await page.evaluate(() => window.gotFocus)).toBe(1);

    // click on btnInside > no-focusLost for control
    await page.click("#btn");
    await page.waitForTimeout(debounceMs);
    expect(await page.evaluate(() => document.activeElement.id)).toBe("btn");
    expect(await page.evaluate(() => window.gotFocus)).toBe(1);

    // click outside and return back
    await page.click("#c2");
    await page.click("#c1");
    expect(await page.evaluate(() => window.gotFocus)).toBe(2);
  });

  test("focusDebounce with mouse", async () => {
    // click on the label
    await page.waitForTimeout(debounceMs + 5);
    await page.click("#text", { delay: 5 });
    expect(await page.evaluate(() => window.gotFocus)).toBe(1);
    await page.waitForTimeout(debounceMs + 5);
    expect(await page.evaluate(() => window.gotFocus)).toBe(1);
    // click on btn sibling
    await page.click("#btn", { delay: 5 });
    expect(await page.evaluate(() => window.gotFocus)).toBe(1);
    await page.waitForTimeout(debounceMs + 5);
    expect(await page.evaluate(() => window.gotFocus)).toBe(1);

    // click outside
    await page.click("#c2", { delay: 5 });
    await page.waitForTimeout(debounceMs + 5);
    expect(await page.evaluate(() => window.gotFocus)).toBe(1);
  });

  test("focusDebounce with touchScreen", async () => {
    // tap on the label
    await page.tap("#text");
    expect(await page.evaluate(() => document.activeElement.id)).toBe("c1");
    expect(await page.evaluate(() => window.gotFocus)).toBe(1);
    await page.tap("#c2");
    await page.waitForTimeout(debounceMs);
    await page.tap("#text");
    await page.waitForTimeout(debounceMs);
    expect(await page.evaluate(() => window.gotFocus)).toBe(2);
  });

  test("focus via tab-keys (keyboard)", async () => {
    await page.click("#c1");
    expect(await page.evaluate(() => window.gotFocus)).toBe(1);
    // focus next
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement.id)).toBe("btn");
    expect(await page.evaluate(() => window.gotFocus)).toBe(1);
    // return focus back
    await page.keyboard.down("Shift");
    await page.keyboard.press("Tab");
    await page.keyboard.up("Shift");
    expect(await page.evaluate(() => document.activeElement.id)).toBe("c1");
    expect(await page.evaluate(() => window.gotFocus)).toBe(1);
    // focus out of label
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => window.gotFocus)).toBe(1);
    await page.keyboard.down("Shift");
    await page.keyboard.press("Tab");
    await page.keyboard.up("Shift");
    await page.keyboard.down("Shift");
    await page.keyboard.press("Tab");
    await page.keyboard.up("Shift");
    expect(await page.evaluate(() => window.gotFocus)).toBe(2);
  });
});
