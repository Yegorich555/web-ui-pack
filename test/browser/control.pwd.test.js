// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { initTestTextControl, testTextControl } from "./control.textTest";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const WUPPasswordControl = require("web-ui-pack/controls/password").default;

initTestTextControl({ htmlTag: "wup-pwd", type: "WUPPasswordControl" });

describe("control.pwd", () => {
  testTextControl();

  const getInfo = () =>
    page.evaluate(() => {
      const el = document.getElementById("trueEl");
      return {
        h: el.offsetHeight,
        activeElementId: document.activeElement.id,
        trueId: el.$refInput.id,
        selection: [el.$refInput.selectionStart, el.$refInput.selectionEnd],
        html: el.outerHTML,
      };
    });

  test("btn-eye", async () => {
    await page.evaluate(() => (document.getElementById("trueEl").$value = "Ab123"));

    let t = await getInfo();
    expect(t.activeElementId).not.toBe(t.trueId);

    // click on btn-eye must send focus + select all
    await page.click("button[eye]");
    await page.waitForTimeout(20);
    t = await getInfo();
    expect(t.activeElementId).toBe(t.trueId);
    expect(t.selection).toEqual([0, 5]);
    expect(t.html).toMatchInlineSnapshot(
      `"<wup-pwd id=\\"trueEl\\"><label for=\\"wup5\\"><span><input placeholder=\\" \\" type=\\"text\\" id=\\"wup5\\" autocomplete=\\"new-password\\"><strong></strong><span class=\\"wup-hidden\\">press Alt + V to show/hide password</span></span><button clear=\\"\\" aria-hidden=\\"true\\" tabindex=\\"-1\\"></button><button eye=\\"off\\" aria-hidden=\\"true\\" tabindex=\\"-1\\"></button></label></wup-pwd>"`
    );
    expect(t.h).toBe(44); // height can change because style changed

    await page.click("button[eye]");
    await page.waitForTimeout(20);
    t = await getInfo();
    expect(t.activeElementId).toBe(t.trueId);
    expect(t.selection).toEqual([0, 5]);
    expect(t.html).toMatchInlineSnapshot(
      `"<wup-pwd id=\\"trueEl\\"><label for=\\"wup5\\"><span><input placeholder=\\" \\" type=\\"password\\" id=\\"wup5\\" autocomplete=\\"new-password\\"><strong></strong><span class=\\"wup-hidden\\">press Alt + V to show/hide password</span></span><button clear=\\"\\" aria-hidden=\\"true\\" tabindex=\\"-1\\"></button><button eye=\\"\\" aria-hidden=\\"true\\" tabindex=\\"-1\\"></button></label></wup-pwd>"`
    );
    expect(t.h).toBe(44);

    await page.evaluate(() => {
      const el = document.getElementById("trueEl");
      el.$refInput.selectionStart = el.$refInput.selectionEnd;
    });
    await page.click("button[eye]");
    await page.waitForTimeout(20);
    t = await getInfo();
    expect(t.selection).toEqual([5, 5]); // selection must stay the same

    await page.click("button[eye]");
    await page.waitForTimeout(20);
    t = await getInfo();
    expect(t.selection).toEqual([5, 5]); // selection must stay the same
  });
});
