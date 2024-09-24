const WUPScrolled = require("web-ui-pack/helpers/scrolled").default;
const { setTimeout: waitTimeout } = require("node:timers/promises");

beforeAll(async () => {
  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "no-preference" }, // allow animations
  ]);
  await page.evaluate(() => {
    renderIt(
      <ul>
        <li>Item 1</li>
        <li>Item 2</li>
        <li>Item 3</li>
      </ul>
    );
    let n = 3;
    window._scrolled = new WUPScrolled(document.querySelector("ul"), {
      onRender: () => {
        const arr = [];
        for (let i = 0; i < 3; ++i) {
          const li = document.createElement("li");
          li.textContent = `Item ${++n}`;
          arr.push(li);
        }
        return arr;
      },
    });
  });
});

describe("helper.scrolled (carousel)", () => {
  test("ordinary behavior", async () => {
    const el = await page.$("ul");
    const boundingBox = await el.boundingBox();
    await page.mouse.move(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);
    // await page.mouse.wheel({ deltaY: 100 });
    // WARN if call tests via Windows-RDP animation doesn't work despite browser returns animation-enabled
    expect(
      await page.evaluate(() => {
        const ul = document.querySelector("ul");
        ul.dispatchEvent(new WheelEvent("wheel", { deltaY: 100, bubbles: true, cancelable: true }));
        return ul.scrollTop;
      })
    ).toBe(0); // scrolling is not started
    expect(await page.evaluate(() => document.body.innerHTML)).toMatchInlineSnapshot(
      `"<div id="app"><ul style="overflow: hidden; touch-action: none; max-height: 54px;"><li>Item 1</li><li>Item 2</li><li>Item 3</li><li>Item 4</li><li>Item 5</li><li>Item 6</li></ul></div>"`
    );

    await waitTimeout("50");
    expect(await page.evaluate(() => document.querySelector("ul").scrollTop)).not.toBe(0); // scrolling is started

    await waitTimeout("1000");
    expect(await page.evaluate(() => document.querySelector("ul").scrollTop)).toBe(0); // scrolling is finished and prev items removed
    expect(await page.evaluate(() => document.body.innerHTML)).toMatchInlineSnapshot(
      `"<div id="app"><ul style="overflow: hidden; touch-action: none;"><li>Item 4</li><li>Item 5</li><li>Item 6</li></ul></div>"`
    );

    await page.mouse.wheel({ deltaY: -100 });
    expect(await page.evaluate(() => document.body.innerHTML)).toMatchInlineSnapshot(
      `"<div id="app"><ul style="overflow: hidden; touch-action: none; max-height: 54px;"><li>Item 7</li><li>Item 8</li><li>Item 9</li><li>Item 4</li><li>Item 5</li><li>Item 6</li></ul></div>"`
    );
    expect(await page.evaluate(() => document.querySelector("ul").scrollTop)).not.toBe(0); // scrolling is not started but elemens is added at the top

    await waitTimeout("50");
    expect(await page.evaluate(() => document.querySelector("ul").scrollTop)).not.toBe(54); // scrolling is started

    await waitTimeout("1000");
    expect(await page.evaluate(() => document.querySelector("ul").scrollTop)).toBe(0); // scrolling is finished and prev items removed
    expect(await page.evaluate(() => document.body.innerHTML)).toMatchInlineSnapshot(
      `"<div id="app"><ul style="overflow: hidden; touch-action: none;"><li>Item 7</li><li>Item 8</li><li>Item 9</li></ul></div>"`
    );
  });
});
