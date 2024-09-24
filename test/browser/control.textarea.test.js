// eslint-disable-next-line @typescript-eslint/no-unused-vars
const WUPTextareaControl = require("web-ui-pack/controls/textarea").default;
const { setTimeout: waitTimeout } = require("node:timers/promises");

/** @type WUPTextareaControl */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let el;

beforeEach(async () => {
  await page.evaluate(() => {
    renderHtml(`<wup-textarea></wup-textarea>`);
  });
  await waitTimeout(20); // timeout required because of debounceFilters
  await page.evaluate(() => (window.el = document.querySelector("wup-textarea")));
});

describe("control.textarea", () => {
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
});
