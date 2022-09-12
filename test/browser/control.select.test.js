// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { initTestTextControl, testTextControl } from "./control.textTest";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const WUPSelectControl = require("web-ui-pack/controls/select").default;

initTestTextControl({ htmlTag: "wup-select", type: "WUPSelectControl" });

describe("control.select", () => {
  testTextControl();

  const getInfo = () =>
    page.evaluate(() => {
      /** @type WUPSelectControl */
      const el = document.getElementById("trueEl");
      return {
        activeElementId: document.activeElement.id,
        trueId: el.$refInput.id,
        html: el.outerHTML,
        isOpen: el.$isOpen,
      };
    });

  test("show/hide by title click", async () => {
    expect((await getInfo()).isOpen).toBe(false);

    // await page.click("#trueEl strong"); // click on title --> ordinary click doesn't work on <strong>
    await page.evaluate(() => document.querySelector("#trueEl strong").click()); // click on title
    await page.waitForTimeout(100);
    expect((await getInfo()).isOpen).toBe(true);

    await page.evaluate(() => document.querySelector("#trueEl strong").click()); // click on title must close popup
    await page.waitForTimeout(100);
    expect((await getInfo()).isOpen).toBe(false);
  });

  test("show by arrowKey + scrollTo", async () => {
    // testcase: open by ArrowUp must scroll to last item at the end of animation
    await page.evaluate(() => {
      /** @type WUPSelectControl */
      const el = document.getElementById("trueEl");
      let ir = 0;
      el.$options.label = "Select Control";
      el.$options.items = [
        { text: "Item N 1", value: ++ir },
        { text: "Item N 2", value: ++ir },
        { text: "Item N 3", value: ++ir },
        { text: "Item N 4", value: ++ir },
        { text: "Item N 5", value: ++ir },
        { text: "Donny 1", value: ++ir },
        { text: "Item N 7", value: ++ir },
        { text: "Donny 2", value: ++ir },
        { text: "Item N 9", value: ++ir },
        { text: "Item N 10", value: ++ir },
      ];
      el.$value = 2;
    });
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]); // allow animations

    // set focus & close
    await page.click("#trueEl input");
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => document.querySelector("#trueEl [menu]").scrollTop)).toBe(0);
    await page.click("#trueEl strong");
    await page.waitForTimeout(500);
    expect((await getInfo()).isOpen).toBe(false);

    // open by ArrowKey
    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(500);
    expect((await getInfo()).isOpen).toBe(true);
    expect(
      await page.evaluate(() => {
        const el = document.querySelector("#trueEl [menu]");
        return el.scrollHeight - el.scrollTop - el.clientHeight;
      })
    ).toBe(0); // check if scroll at the end
  });
});
