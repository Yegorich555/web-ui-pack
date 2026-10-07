/** @type {import("web-ui-pack/controls/textRich").default} */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let el;

beforeEach(async () => {
  await page.evaluate(() => renderHtml(`<wup-textrich></wup-textrich>`));
  await page.waitForTimeout(20); // timeout required because of debounceFilters
  await page.evaluate(() => (window.el = document.querySelector("wup-textrich")));
});

/** Returns html of editor & selected text */
const getState = () => page.evaluate(() => [el.$refInput.innerHTML, window.getSelection().toString()]);

/** Sets value & clicks on text in editor (clickCount 2 selects word, 3 - line) */
async function clickText(html, text, clickCount) {
  const { x, y } = await page.evaluate(
    (h, s) => {
      el.$value = h;
      const w = document.createTreeWalker(el.$refInput, NodeFilter.SHOW_TEXT);
      let n = w.nextNode();
      while (!n.data.includes(s)) {
        n = w.nextNode();
      }
      const r = document.createRange();
      r.setStart(n, n.data.indexOf(s));
      r.setEnd(n, n.data.indexOf(s) + s.length);
      const b = r.getBoundingClientRect();
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    },
    html,
    text
  );
  await page.mouse.click(x, y, { clickCount });
}

describe("control.textRich", () => {
  test("selected text is wrapped into typed quote or bracket", async () => {
    // double click selects word (with trailing space on Windows): whitespaces stay outside
    await clickText("<p>Some text here</p>", "text", 2);
    await page.keyboard.type('"');
    expect(await getState()).toEqual(['<div>Some "text" here</div>', "text"]); // selection is kept: to wrap again
    await page.keyboard.type("(");
    expect(await getState()).toEqual(['<div>Some "(text)" here</div>', "text"]);
    expect(await page.evaluate(() => el.$value)).toBe('Some "(text)" here');

    // every wrapping is a separate step of undo
    await page.keyboard.down("ControlLeft");
    await page.keyboard.press("KeyZ");
    await page.keyboard.up("ControlLeft");
    await page.waitForTimeout(10);
    expect(await getState()).toEqual(['<div>Some "text" here</div>', "text"]);

    // typed text replaces wrapped one
    await page.keyboard.type("new");
    expect(await getState()).toEqual(['<div>Some "new" here</div>', ""]);

    // triple click selects line with line break: closing char is placed at the end of line
    await clickText("<p>Some <strong>bold</strong></p><p>Next</p>", "Some", 3);
    await page.keyboard.type("[");
    expect(await getState()).toEqual(["<div>[Some <b>bold]</b></div><div>Next</div>", "Some bold"]);

    // char without pair replaces selection as usual
    await clickText("<p>Some text</p>", "text", 2);
    await page.keyboard.type(")");
    expect(await getState()).toEqual(["<div>Some )</div>", ""]);

    // selection without visible chars is replaced as well
    await page.evaluate(() => {
      el.$value = "<p>Some text</p>";
      el.$refInput.setSelectionRange(4, 5);
    });
    await page.keyboard.type('"');
    expect(await getState()).toEqual(['<div>Some"text</div>', ""]);
  });
});
