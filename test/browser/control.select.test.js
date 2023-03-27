// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { initTestTextControl, testTextControl } from "./control.textTest";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const WUPSelectControl = require("web-ui-pack/controls/select").default;

initTestTextControl({ htmlTag: "wup-select", type: "WUPSelectControl" });

describe("control.select", () => {
  testTextControl({ isComboCtrl: true });

  const getInfo = () =>
    page.evaluate(() => {
      /** @type WUPSelectControl */
      const el = document.getElementById("trueEl");
      return {
        activeElementId: document.activeElement.id,
        trueId: el.$refInput.id,
        html: el.outerHTML,
        isShown: el.$isShown,
        isMenuExists: !!el.$refPopup,
      };
    });

  test("show/hide by title click", async () => {
    expect((await getInfo()).isShown).toBe(false);

    const click = () =>
      page.evaluate(() => {
        const el = document.querySelector("#trueEl strong");
        el.dispatchEvent(new MouseEvent("pointerdown"));
        el.click();
        return new Promise((res) => setTimeout(res, 100));
      });

    // await page.click("#trueEl strong"); // click on title --> ordinary click doesn't work on <strong>
    await click(); // click on title
    expect((await getInfo()).isShown).toBe(true);

    await click(); // click on title
    expect((await getInfo()).isShown).toBe(false);
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
    expect((await getInfo()).isShown).toBe(false);

    // open by ArrowKey
    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(500);
    expect((await getInfo()).isShown).toBe(true);
    expect(
      await page.evaluate(() => {
        const el = document.querySelector("#trueEl [menu]");
        return el.scrollHeight - el.scrollTop - el.clientHeight;
      })
    ).toBe(0); // check if scroll at the end
  });

  test("show/hide animation works", async () => {
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]); // allow animations
    // show
    await page.evaluate(() => document.getElementById("trueEl").focus());
    await page.waitForTimeout(310); // animation takes 300ms by default
    let r = await getInfo();
    expect(r.isShown).toBe(true);
    expect(r.isMenuExists).toBe(true);

    // hide
    await page.evaluate(() => document.activeElement.blur());
    await page.waitForTimeout(250); // animation takes 300ms by default but we wait partially
    r = await getInfo();
    expect(r.isShown).toBe(false);
    expect(r.isMenuExists).toBe(true); // because still closing

    await page.waitForTimeout(100); // animation takes 300ms by default
    r = await getInfo();
    expect(r.isShown).toBe(false);
    expect(r.isMenuExists).toBe(false); // because removed after animation end

    // case: focus again during the closing by focusout must open
    await page.evaluate(() => document.getElementById("trueEl").focus());
    await page.waitForTimeout(200);
    await page.evaluate(() => document.activeElement.blur());
    await page.waitForTimeout(100);
    await page.evaluate(() => document.getElementById("trueEl").focus());
    await page.waitForTimeout(300);
    r = await getInfo();
    expect(r.isMenuExists).toBe(true);
    expect(r.isShown).toBe(true);
  });
});
