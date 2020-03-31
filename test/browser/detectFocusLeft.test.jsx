/* eslint-disable jsx-a11y/no-autofocus */
const { detectFocusLeft } = require("web-ui-pack");

beforeAll(async () => {
  await page.evaluate(() => {
    renderIt(
      <>
        <label id="ctrl" htmlFor="c1">
          <span id="text">TextInput</span>
          <input id="c1" autoFocus />
        </label>
        <input id="c2" />
      </>
    );
    document.querySelector("#c1").addEventListener("blur", () => {
      window.wasBlur = true;
      detectFocusLeft(
        document.querySelector("#ctrl"),
        () => {
          window.wasLeft = true;
        },
        10
      );
    });
  });
});

describe("detectFocusLeft", () => {
  test("ordinary behavior", async () => {
    let id = await page.evaluate(() => document.activeElement.id);
    expect(id).toBe("c1");

    // click outside the control
    await page.click("#c2");
    await page.waitFor(20);
    expect(await page.evaluate(() => window.wasBlur)).toBe(true);
    expect(await page.evaluate(() => window.wasLeft)).toBe(true);

    // ordinary click on the label
    await page.click("#ctrl");
    id = await page.evaluate(() => {
      return document.activeElement.id;
    });
    expect(id).toBe("c1");
  });

  test("focusDebounce behavior", async () => {
    const id = await page.evaluate(() => {
      window.wasLeft = false;
      window.wasBlur = false;
      return document.activeElement.id;
    });
    expect(id).toBe("c1");

    // click on the label
    await page.click("#text", { delay: 5 });
    expect(await page.evaluate(() => window.wasBlur)).toBe(true);
    await page.waitFor(20);
    expect(await page.evaluate(() => window.wasLeft)).toBe(false);
  });

  test("focusDebounce with touchScreen", async () => {
    const id = await page.evaluate(() => {
      window.wasLeft = false;
      window.wasBlur = false;
      return document.activeElement.id;
    });
    expect(id).toBe("c1");

    // tap on the label
    await page.tap("#text");
    expect(await page.evaluate(() => window.wasBlur)).toBe(true);
    await page.waitFor(20);
    expect(await page.evaluate(() => window.wasLeft)).toBe(false);
  });
});
