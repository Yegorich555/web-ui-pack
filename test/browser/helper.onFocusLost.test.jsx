/* eslint-disable react/button-has-type */
// ES5 import is required otherwise jest-env conflicts with puppeeter-env
const onFocusLost = require("web-ui-pack/helpers/onFocusLost").default;

// impossible testCase: Click on dev.console - focusStay, because no-way to implement click on dev.console properly

const debounceMs = 1;
beforeAll(async () => {
  await page.evaluate(() => {
    renderIt(
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

describe("helper.onFocusLost", () => {
  test("ordinary behavior", async () => {
    let id = await page.evaluate(() => document.activeElement.id);
    expect(id).toBe("c1");

    // click outside the control
    await page.click("#c2");
    await page.waitForTimeout(debounceMs);
    expect(await page.evaluate(() => window.gotLeft)).toBe(1);

    // ordinary click on the label > should return focus to input
    await page.click("#ctrl");
    id = await page.evaluate(() => document.activeElement.id);
    expect(id).toBe("c1");

    // ordinary click on the label > should move focus to label and returns back to input > so no event again
    await page.click("#text");
    await page.click("#text"); // second time to detect counterIssues
    expect(id).toBe("c1");
    expect(await page.evaluate(() => window.gotLeft)).toBe(1);
    // click on btnInside > no-focusLost for control
    await page.click("#btn");
    await page.waitForTimeout(debounceMs);
    expect(await page.evaluate(() => document.activeElement.id)).toBe("btn");
    expect(await page.evaluate(() => window.gotLeft)).toBe(1);

    // mouseDown on label, mouseMove, mouseUp on label - focusLost (because click is not fired after)
    const r = await page.evaluate(() => {
      window.gotLeft = 0;
      const el = document.querySelector("#text");
      // WARN: el.getBoundingClientRect() doesn't work
      return { x: el.offsetLeft, y: el.offsetTop, height: el.offsetHeight, width: el.offsetWidth };
    });
    // await page.screenshot({ path: `d:/test.jpeg` });
    await page.mouse.move(r.x + r.width / 4, r.y + r.height / 2);
    await page.mouse.down();
    expect(await page.evaluate(() => document.activeElement?.tagName)).toBe("BODY");
    await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
    expect(await page.evaluate(() => window.gotLeft)).toBe(0);
    await page.mouse.up();
    await page.waitForTimeout(debounceMs);
    expect(await page.evaluate(() => window.gotLeft)).toBe(1);
  });

  test("focusDebounce with mouse", async () => {
    await page.evaluate(() => (window.gotLeft = 0));
    // click on the label
    await page.click("#text", { delay: 5 });
    expect(await page.evaluate(() => window.gotLeft)).toBe(0);
    await page.waitForTimeout(debounceMs + 5);
    expect(await page.evaluate(() => window.gotLeft)).toBe(0);

    // click outside
    await page.click("#c2", { delay: 5 });
    expect(await page.evaluate(() => window.gotLeft)).toBe(0);
    await page.waitForTimeout(debounceMs + 5);
    expect(await page.evaluate(() => window.gotLeft)).toBe(1);
  });

  test("focusDebounce with touchScreen", async () => {
    await page.evaluate(() => (window.gotLeft = 0));
    // tap on the label
    await page.tap("#text");
    expect(await page.evaluate(() => document.activeElement.id)).toBe("c1");
    expect(await page.evaluate(() => window.gotLeft)).toBe(0);
    await page.tap("#c2");
    await page.waitForTimeout(debounceMs);
    expect(await page.evaluate(() => window.gotLeft)).toBe(1);
  });

  // todo focus via tab-keys
});
