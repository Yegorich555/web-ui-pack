// eslint-disable-next-line @typescript-eslint/no-unused-vars
const WUPTextAreaControl = require("web-ui-pack/controls/textArea").default;

/** @type WUPTextAreaControl */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let el;

beforeEach(async () => {
  await page.evaluate(() => {
    renderHtml(`<wup-textarea></wup-textarea>`);
  });
  await page.waitForTimeout(20); // timeout required because of debounceFilters
  await page.evaluate(() => (window.el = document.querySelector("wup-textarea")));
});

describe("control.textArea", () => {
  test("user can type new line", async () => {
    await page.type("[role=textbox]", "Abc");
    expect(await page.evaluate(() => el.$value)).toBe("Abc");

    await page.keyboard.press("Enter");
    expect(await page.evaluate(() => el.$refInput.innerHTML)).toMatchInlineSnapshot(`"Abc<div><br></div>"`);
    expect(await page.evaluate(() => el.$value)).toBe("Abc"); // because value is trimmed

    await page.type("[role=textbox]", "j");
    expect(await page.evaluate(() => el.$refInput.innerHTML)).toMatchInlineSnapshot(`"Abc<div>j</div>"`);
    expect(await page.evaluate(() => el.$value)).toBe("Abc\nj");

    await page.keyboard.press("Enter");
    await page.type("[role=textbox]", "h");
    expect(await page.evaluate(() => el.$refInput.innerHTML)).toMatchInlineSnapshot(`"Abc<div>j</div><div>h</div>"`);
    expect(await page.evaluate(() => el.$value)).toBe("Abc\nj\nh");

    await page.keyboard.press("Backspace");
    expect(await page.evaluate(() => el.$refInput.innerHTML)).toMatchInlineSnapshot(`"Abc<div>j</div><div><br></div>"`);
    expect(await page.evaluate(() => el.$value)).toBe("Abc\nj");

    await page.keyboard.press("Backspace");
    expect(await page.evaluate(() => el.$refInput.innerHTML)).toMatchInlineSnapshot(`"Abc<div>j</div>"`);
    expect(await page.evaluate(() => el.$value)).toBe("Abc\nj");

    await page.keyboard.press("Backspace");
    expect(await page.evaluate(() => el.$refInput.innerHTML)).toMatchInlineSnapshot(`"Abc<div><br></div>"`);
    expect(await page.evaluate(() => el.$value)).toBe("Abc");
  });

  test("undo/redo after new line (the same in TextRich)", async () => {
    /** Types text with new line & calls undo/redo: returns [caret, value] after every step */
    const run = async (tag) => {
      await page.evaluate((t) => renderHtml(`<${t}></${t}>`), tag);
      await page.evaluate((t) => (window.el = document.querySelector(t)).focus(), tag);
      await page.waitForTimeout(20);
      const arr = [];
      const saveState = async () =>
        arr.push(await page.evaluate(() => [el.$refInput.selectionStart, el.$refInput.value]));
      const history = async (isRedo) => {
        await page.keyboard.down("ControlLeft");
        isRedo && (await page.keyboard.down("ShiftLeft"));
        await page.keyboard.press("KeyZ");
        isRedo && (await page.keyboard.up("ShiftLeft"));
        await page.keyboard.up("ControlLeft");
        await page.waitForTimeout(10);
        await saveState();
      };
      await page.keyboard.type("abc");
      await saveState();
      await page.keyboard.press("Enter");
      await saveState();
      await page.keyboard.type("d");
      await saveState();
      await history();
      await history();
      await history();
      await history(true);
      await history(true);
      await history(true);
      return arr;
    };

    const caret = [3, 4, 5, 4, 3, 0, 3, 4, 5]; // new line is counted as 1 char
    const area = ["abc", "abc\n", "abc\nd"];
    expect(await run("wup-textarea")).toStrictEqual(
      [...area, area[1], area[0], "", ...area].map((v, i) => [caret[i], v])
    );
    const rich = ["abc", "<p>abc</p><p><br></p>", "<p>abc</p><p>d</p>"];
    expect(await run("wup-textrich")).toStrictEqual(
      [...rich, rich[1], rich[0], "", ...rich].map((v, i) => [caret[i], v])
    );
  });
});
